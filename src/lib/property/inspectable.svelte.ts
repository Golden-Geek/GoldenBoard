import {
    PropertyContainer,
    PropertyType,
    Property,
    type PropertyContainerDefinition,
    type PropertyNode,
    type PropertySingleDefinition,
    type PropertyValueType,
    type WarningError
} from "./property.svelte";

export const activeUserIDs: { [key: string]: InspectableWithProps } = $state({});

function registerActiveUserID(userID: string, obj: InspectableWithProps) {
    if (userID == '') return;
    activeUserIDs[userID] = obj;
}

function unregisterActiveUserID(userID: string) {
    if (userID == '') return;
    delete activeUserIDs[userID];
}

export function sanitizeUserID(userID: string): string {
    if (userID == null || userID === '' || userID === undefined) return '';
    return userID.trim().toLocaleLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '_');
}


export class InspectableWithProps {
    id: string = $state('');
    iType: string = $state('');
    props: { [key: string]: PropertyNode } = $state({});
    definitions = $derived(this.getPropertyDefinitions());
    userID = $derived((this.getSingleProp('userID').get() as string));
    autoID = $derived(this.userID || this.getAutoID());

    warningsAndErrors = $derived.by(() => {
        let result: { property: Property, warningAndErrors: { [key: string]: WarningError } }[] = [];
        const allProps = this.getAllSingleProps();
        for (const prop of allProps) {
            if (!prop.warningsAndErrors || Object.keys(prop.warningsAndErrors).length === 0) continue;
            result.push({ property: prop, warningAndErrors: prop.warningsAndErrors });
        }
        return result;
    });

    private _activeUserIDKey = '';

    /** User-defined property definitions (persisted in snapshot). */
    private _customPropDefs: { [key: string]: PropertySingleDefinition } = $state({});

    userIDDestroy = $effect.root(() => {
        $effect(() => {
            if (this.userID === this._activeUserIDKey) return;

            if (this._activeUserIDKey !== '') {
                unregisterActiveUserID(this._activeUserIDKey);
                this._activeUserIDKey = '';
            }

            if (this.userID !== '') {
                registerActiveUserID(this.userID, this);
                this._activeUserIDKey = this.userID;
            }


        });

        return () => {
            if (this._activeUserIDKey !== '') {
                unregisterActiveUserID(this._activeUserIDKey);
                this._activeUserIDKey = '';
            };
        }
    });


    constructor(iType: string, id?: string) {
        this.iType = iType;
        this.id = id ?? (iType + '-' + crypto.randomUUID());

    }


    cleanup() {
        if (this._activeUserIDKey !== '') {
            unregisterActiveUserID(this._activeUserIDKey);
            this._activeUserIDKey = '';
        }

        this.unloadPropsTree(this.props);
    }


    getAutoID(): string {
        return '';
    }

    /**
     * Optional parent relationship for relative expression lookups.
     * Subclasses should override when they have a meaningful hierarchy.
     */
    getParent(): InspectableWithProps | null {
        return null;
    }

    /**
     * Walk up the parent chain by `levelsUp` steps.
     * Returns null if the chain ends before reaching the requested ancestor.
     */
    getAncestor(levelsUp: number): InspectableWithProps | null {
        if (!Number.isFinite(levelsUp) || levelsUp <= 0) return this;
        let current: InspectableWithProps | null = this;
        for (let i = 0; i < levelsUp; i++) {
            current = current?.getParent?.() ?? null;
            if (!current) return null;
        }
        return current;
    }

    private unloadPropsTree(props: { [key: string]: PropertyNode } | undefined = this.props) {
        if (!props) return;
        for (const key of Object.keys(props)) {
            props[key]?.cleanup?.();
        }
    }

    private buildPropsFromDefinitions(
        defProps: { [key: string]: (PropertySingleDefinition | PropertyContainerDefinition) },
        basePath: string = ''
    ): { [key: string]: PropertyNode } {
        let props: { [key: string]: PropertyNode } = {};

        for (let propKey in defProps) {
            let propDef = defProps[propKey];
            const keyPath = basePath ? `${basePath}.${propKey}` : propKey;
            let propChildren = (propDef as PropertyContainerDefinition).children;
            if (propChildren !== undefined) {
                let childrenProps = this.buildPropsFromDefinitions(propChildren, keyPath);
                props[propKey] = new PropertyContainer(
                    propDef as PropertyContainerDefinition,
                    childrenProps,
                    this,
                    keyPath,
                    (propDef as PropertyContainerDefinition).collapsedByDefault
                );
            } else {
                props[propKey] = new Property(propDef as PropertySingleDefinition, this, keyPath);
            }
        }

        return props;
    }

    private reconcilePropsFromDefinitions(
        existing: { [key: string]: PropertyNode },
        defs: { [key: string]: PropertySingleDefinition | PropertyContainerDefinition },
        basePath: string = ''
    ) {
        // Remove keys no longer in defs
        for (const key of Object.keys(existing)) {
            if (!Object.prototype.hasOwnProperty.call(defs, key)) {
                existing[key]?.cleanup?.();
                delete existing[key];
            }
        }

        for (const key of Object.keys(defs)) {
            const def = defs[key];
            const keyPath = basePath ? `${basePath}.${key}` : key;
            const isContainer = (def as PropertyContainerDefinition).children !== undefined;

            const current = existing[key];

            if (isContainer) {
                const containerDef = def as PropertyContainerDefinition;
                if (current && 'children' in current) {
                    // reuse container node
                    (current as PropertyContainer).definition = containerDef;
                    (current as PropertyContainer).owner = this;
                    (current as PropertyContainer).keyPath = keyPath;

                    const childrenDef = containerDef.children ?? {};
                    this.reconcilePropsFromDefinitions(
                        (current as PropertyContainer).children,
                        childrenDef,
                        keyPath
                    );
                } else {
                    // replace leaf/missing with container
                    current?.cleanup?.();
                    const childrenProps = this.buildPropsFromDefinitions(containerDef.children ?? {}, keyPath);
                    existing[key] = new PropertyContainer(
                        containerDef,
                        childrenProps,
                        this,
                        keyPath,
                        containerDef.collapsedByDefault
                    );
                }
            } else {
                const leafDef = def as PropertySingleDefinition;
                if (current && !('children' in current)) {
                    // reuse leaf node
                    (current as Property).definition = leafDef;
                    (current as Property).owner = this;
                    (current as Property).keyPath = keyPath;
                } else {
                    // replace container/missing with leaf
                    current?.cleanup?.();
                    existing[key] = new Property(leafDef, this, keyPath);
                }
            }
        }

        return existing;
    }

    setupProps() {
        this.unloadPropsTree(this.props);
        this.props = this.buildPropsFromDefinitions(this.definitions || {});
    }


    getUserIDDefinition(): PropertySingleDefinition {
        return {
            name: 'User ID',
            type: PropertyType.STRING,
            default: '',
            canDisable: true,
            filterFunction: (value: any) => {
                return sanitizeUserID(value as string);
            }
        }
    }

    /** Returns a stable view of custom property definitions. */
    getCustomPropertyDefinitions(): { [key: string]: PropertySingleDefinition } {
        return this._customPropDefs;
    }

    private sanitizeCustomPropKey(key: string): string {
        const raw = String(key ?? '').trim().replace(/\./g, '_');
        return sanitizeUserID(raw);
    }

    private normalizeCustomPropDef(def: Partial<PropertySingleDefinition> & { type: PropertyType; default?: unknown }): PropertySingleDefinition {
        const type = def.type;
        const allowed = new Set<PropertyType>([
            PropertyType.STRING,
            PropertyType.TEXT,
            PropertyType.BOOLEAN,
            PropertyType.FLOAT,
            PropertyType.INTEGER,
            PropertyType.ENUM,
            PropertyType.CSSSIZE
        ]);

        if (!allowed.has(type)) {
            throw new Error(`Unsupported custom property type '${type}'.`);
        }

        const name = String(def.name ?? 'Custom Property');
        const canDisable = !!def.canDisable;
        const readOnly = !!def.readOnly;
        const description = def.description != null ? String(def.description) : undefined;

        let options = def.options;
        if (type === PropertyType.ENUM) {
            if (!options || typeof options !== 'object') {
                options = { option1: 'Option 1' };
            }
        } else {
            options = undefined;
        }

        let dflt: PropertyValueType;
        switch (type) {
            case PropertyType.BOOLEAN:
                dflt = Boolean(def.default ?? false);
                break;
            case PropertyType.INTEGER:
                dflt = Number.isFinite(Number(def.default)) ? Math.trunc(Number(def.default)) : 0;
                break;
            case PropertyType.FLOAT:
                dflt = Number.isFinite(Number(def.default)) ? Number(def.default) : 0;
                break;
            case PropertyType.ENUM: {
                const keys = Object.keys(options ?? {});
                const v = String(def.default ?? keys[0] ?? 'option1');
                dflt = keys.includes(v) ? v : (keys[0] ?? 'option1');
                break;
            }
            case PropertyType.CSSSIZE:
                dflt = (def.default as any) ?? 0;
                break;
            case PropertyType.TEXT:
            case PropertyType.STRING:
            default:
                dflt = String(def.default ?? '');
                break;
        }

        const out: PropertySingleDefinition = {
            name,
            type,
            default: dflt,
            canDisable,
            readOnly,
            description,
            options
        };

        if (type === PropertyType.TEXT && def.syntax) {
            out.syntax = def.syntax;
        }

        if (typeof def.min === 'number') out.min = def.min;
        if (typeof def.max === 'number') out.max = def.max;
        if (typeof def.step === 'number') out.step = def.step;

        return out;
    }

    /**
     * Add or update a user-defined custom property.
     * The property will appear under `customProps.<key>`.
     */
    addCustomProperty(key: string, def: Partial<PropertySingleDefinition> & { type: PropertyType; default?: unknown }) {
        const k = this.sanitizeCustomPropKey(key);
        if (!k) throw new Error('Custom property key is empty.');
        const normalized = this.normalizeCustomPropDef({ ...def, name: def.name ?? key });
        this._customPropDefs[k] = normalized;
    }

    removeCustomProperty(key: string) {
        const k = this.sanitizeCustomPropKey(key);
        if (!k) return;
        delete this._customPropDefs[k];
    }

    clearCustomProperties() {
        for (const k of Object.keys(this._customPropDefs)) {
            delete this._customPropDefs[k];
        }
    }

    getPropertyDefinitions(beforeOrAfter?: 'before' | 'after' | undefined): { [key: string]: (PropertySingleDefinition | PropertyContainerDefinition) } | null {
        let beforeDefs: { [key: string]: (PropertySingleDefinition | PropertyContainerDefinition) } = {
            userID: this.getUserIDDefinition(),
        };
        if (beforeOrAfter === 'before') return beforeDefs;
        let afterDefs: { [key: string]: (PropertySingleDefinition | PropertyContainerDefinition) } = {

            custom: {
                name: 'Advanced',
                collapsedByDefault: true,
                children: {
                    css: {
                        name: 'Custom CSS',
                        type: PropertyType.TEXT,
                        default: '',
                        syntax: 'css'
                    } as PropertySingleDefinition,
                    script: {
                        name: 'Custom Script',
                        type: PropertyType.TEXT,
                        default: '',
                        syntax: 'js'
                    } as PropertySingleDefinition

                }
            } as PropertyContainerDefinition,

            customProps: {
                name: 'Custom Properties',
                isCustomProperties: true,
                children: this.getCustomPropertyDefinitions()
            } as PropertyContainerDefinition,
        };

        if (beforeOrAfter === 'after') return afterDefs;
        return { ...beforeDefs, ...afterDefs };
    }

    getDefinitionForProp(propKey: string): PropertySingleDefinition | null {
        let keySplit = propKey.split('.');
        let currentLevel: any = this.definitions;
        for (let i = 0; i < keySplit.length; i++) {
            let part = keySplit[i];
            let propDef = currentLevel ? currentLevel[part] : null;
            if (propDef === undefined || propDef === null) {
                return null;
            }
            if (i === keySplit.length - 1) {
                if (!propDef.type || propDef.children) {
                    return null;
                }
                return propDef;
            }
            if ('children' in propDef) {
                currentLevel = propDef.children;
            } else {
                return null;
            }
        }
        return null;
    }



    getProp(propKey: string): PropertyNode | null {


        let keySplit = propKey.split('.');
        if (keySplit.length >= 1) {
            let currentLevel: any = this.props;
            for (let i = 0; i < keySplit.length; i++) {
                let part = keySplit[i];
                let prop = currentLevel[part];
                if (prop === undefined) {
                    return null;
                }
                if (i === keySplit.length - 1) {
                    return prop;
                }

                currentLevel = prop.children;
            }
            return null;
        }
        return null;
    }

    getSingleProp(propKey: string): Property {
        const prop = this.getProp(propKey);
        return prop! as Property;
    }

    getAllSingleProps(): Property[] {
        const result: Property[] = [];
        for (const key of Object.keys(this.props)) {
            const prop = this.props[key];
            if (prop instanceof Property) {
                result.push(prop);
            } else if (prop instanceof PropertyContainer) {
                result.push(...prop.getAllSingleProps());
            }
        }
        return result;
    }

    toSnapshot(includeID: boolean = true): any {
        const definitions = this.getPropertyDefinitions() || {};

        const propsSnapshot: any = {};
        for (const key of Object.keys(definitions)) {
            const node = this.props[key];
            const snap = node?.toSnapshot?.();
            if (snap !== undefined) propsSnapshot[key] = snap;
        }

        const customPropDefsSnapshot: any = {};
        for (const key of Object.keys(this._customPropDefs)) {
            const d = this._customPropDefs[key];
            // Keep this JSON-safe (no functions)
            customPropDefsSnapshot[key] = {
                name: d.name,
                type: d.type,
                default: d.default,
                canDisable: d.canDisable ?? false,
                readOnly: d.readOnly ?? false,
                description: d.description,
                options: d.options,
                min: typeof d.min === 'number' ? d.min : undefined,
                max: typeof d.max === 'number' ? d.max : undefined,
                step: typeof d.step === 'number' ? d.step : undefined,
                syntax: d.syntax
            };
        }

        return {
            id: includeID ? this.id : undefined,
            props: propsSnapshot,
            customPropDefs: customPropDefsSnapshot
        };
    }

    applySnapshot(snapshot: any, options?: { mode?: 'patch' | 'replace' }) {
        if (snapshot === null || snapshot === undefined) return;

        // Restore custom property definitions first so the props tree can be reconciled.
        if (snapshot.customPropDefs && typeof snapshot.customPropDefs === 'object') {
            const mode = options?.mode ?? 'patch';
            if (mode === 'replace') {
                this.clearCustomProperties();
            }

            for (const k of Object.keys(snapshot.customPropDefs)) {
                const raw = snapshot.customPropDefs[k];
                if (!raw || typeof raw !== 'object') continue;
                try {
                    const type = (raw as any).type as PropertyType;
                    this.addCustomProperty(k, {
                        name: (raw as any).name,
                        type,
                        default: (raw as any).default,
                        canDisable: (raw as any).canDisable,
                        readOnly: (raw as any).readOnly,
                        description: (raw as any).description,
                        options: (raw as any).options,
                        min: (raw as any).min,
                        max: (raw as any).max,
                        step: (raw as any).step,
                        syntax: (raw as any).syntax
                    });
                } catch {
                    // ignore invalid custom defs
                }
            }
        }


        const newID = snapshot.id ?? this.id;
        if (newID !== this.id) {
            this.setID(newID);
        }
        const defs = this.getPropertyDefinitions() || {};
        // Reconcile existing nodes in-place to avoid recreating thousands of properties.
        // Only creates/removes nodes when definitions changed.
        if (!this.props || typeof this.props !== 'object') {
            this.props = this.buildPropsFromDefinitions(defs);
        } else {
            this.reconcilePropsFromDefinitions(this.props, defs);
        }

        if (snapshot.props && typeof snapshot.props === 'object') {
            const mode = options?.mode ?? 'patch';

            if (mode === 'replace') {
                // Only reset nodes that are NOT present in the incoming snapshot.
                // This avoids touching everything when applying a small patch.
                for (const key of Object.keys(this.props)) {
                    if (Object.prototype.hasOwnProperty.call(snapshot.props, key)) continue;
                    this.props[key]?.resetToDefault?.();
                }
            }

            // Patch/apply only nodes present in snapshot.
            for (const key of Object.keys(snapshot.props)) {
                if (!Object.prototype.hasOwnProperty.call(this.props, key)) continue;
                this.props[key]?.applySnapshot?.(snapshot.props[key]);
            }
        }
    }

    setID(newID: string) {
        this.id = newID;
    }

};