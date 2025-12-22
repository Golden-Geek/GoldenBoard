import { PropertyContainer, PropertyType, Property, type PropertyContainerDefinition, type PropertyNode, type PropertySingleDefinition } from "./property.svelte";

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
    return userID.trim().toLocaleLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_\-]/g, '');
}


export class InspectableWithProps {
    id: string = $state('');
    iType: string = $state('');
    props: { [key: string]: PropertyNode } = $state({});
    definitions = $derived(this.getPropertyDefinitions());
    userID = $derived((this.getSingleProp('userID').get() as string));

    private _activeUserIDKey = '';

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

    cleanup() {
        if (this._activeUserIDKey !== '') {
            unregisterActiveUserID(this._activeUserIDKey);
            this._activeUserIDKey = '';
        }

        this.unloadPropsTree(this.props);
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

    getPropertyDefinitions(): { [key: string]: (PropertySingleDefinition | PropertyContainerDefinition) } | null {
        return { userID: this.getUserIDDefinition() };
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

    toSnapshot(includeID: boolean = true): any {
        const definitions = this.getPropertyDefinitions() || {};

        const propsSnapshot: any = {};
        for (const key of Object.keys(definitions)) {
            const node = this.props[key];
            const snap = node?.toSnapshot?.();
            if (snap !== undefined) propsSnapshot[key] = snap;
        }

        return {
            id: includeID ? this.id : undefined,
            props: propsSnapshot
        };
    }

    applySnapshot(snapshot: any, options?: { mode?: 'patch' | 'replace' }) {
        if (snapshot === null || snapshot === undefined) return;


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