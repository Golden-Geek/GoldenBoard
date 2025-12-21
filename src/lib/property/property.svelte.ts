import { ColorUtil, type Color } from "./Color.svelte";

export class Property {
    value: PropertyValueType;
    enabled: boolean | undefined;
    mode: PropertyMode | undefined;
    expression: string | undefined;

    owner: InspectableWithProps | undefined;
    keyPath: string | undefined;

    constructor(definition: PropertySingleDefinition, owner?: InspectableWithProps, keyPath?: string) {
        this.value = $state(convertType(definition.default, definition.type));
        this.enabled = $state(undefined);
        this.mode = $state(undefined);
        this.expression = $state(undefined);

        this.owner = owner;
        this.keyPath = keyPath;
    }

    getDefinition(): PropertySingleDefinition | null {
        const owner = this.owner;
        const keyPath = this.keyPath;
        if (!owner || !keyPath) return null;
        return owner.getDefinitionForProp(keyPath);
    }

    getResolved<T>(defaultValue = null as T): ResolvedProperty<T> {
        const def = this.getDefinition();
        const canDisable = !!def?.canDisable;

        let enabled = this.enabled;
        if (enabled === undefined) enabled = !canDisable;

        const fallback = (defaultValue !== null ? defaultValue : (def?.default as T)) as T;
        if (!enabled) {
            return { current: fallback, raw: fallback };
        }

        const raw = this.value as T;

        if (!this.mode || this.mode === PropertyMode.VALUE) {
            return { current: raw, raw };
        }

        return this.parseExpression<T>(this.expression || '', raw, fallback);
    }

    get<T>(defaultValue = null as T): T | null {
        return this.getResolved<T>(defaultValue).current;
    }

    getValue<T>(defaultValue = null as T): T | null {
        return this.get<T>(defaultValue);
    }

    getRaw(defaultValue: any = null): PropertyValueType | null {
        const def = this.getDefinition();
        const canDisable = !!def?.canDisable;

        let enabled = this.enabled;
        if (enabled === undefined) enabled = !canDisable;
        if (!enabled) return defaultValue;

        return (this.value as PropertyValueType) ?? defaultValue;
    }

    setRaw(value: PropertyValueType) {
        this.value = value;
    }

    set(value: PropertyValueType) {
        this.setRaw(value);
    }

    private parseExpression<T>(expression: string, rawValue: any, fallbackValue: any): ResolvedProperty<T> {
        let result = {} as ResolvedProperty<T>;

        result.current = rawValue as T;
        result.raw = rawValue as T;

        const expr = (expression ?? '').trim();
        if (expr === '') return result;

        const owner = this.owner;
        const propKey = this.keyPath;
        if (!owner || !propKey) return result;

        // Optional "formula" style prefix
        const js = expr.startsWith('=') ? expr.slice(1).trim() : expr;

        // Very small safety net (still not fully secure if user-controlled)
        const forbidden = [
            'function',
            '=>',
            'new ',
            'this',
            'window',
            'document',
            'globalThis',
            'import',
            'eval',
            'constructor',
            '__proto__'
        ];
        if (forbidden.some((t) => js.includes(t))) {
            result.error = 'Expression contains forbidden syntax.';
            return result;
        }

        try {
            // Allow reading other props via prop("some.key", fallback?)
            const prop = <U>(key: string, fallback?: U) => {
                let keySplit = key.split(':');
                let target = owner as InspectableWithProps;
                let tKey = key;
                if (keySplit.length > 1) {
                    target = keySplit[0] == 'this' || keySplit[0] == '' ? owner : activeUserIDs[keySplit[0]];
                    tKey = keySplit[1];
                }

                if (!target) {
                    throw new Error(`Target '${keySplit[0]}' not found for prop('${key}').`);
                }

                if (!target.getProp(tKey)) {
                    throw new Error(
                        `Property '${tKey}' not found on target '${keySplit[0]}' for prop('${key}').`
                    );
                }

                return target.getPropValue<U>(tKey, fallback as U).current as U;
            };

            const fn = new Function('Math', 'prop', `return (${js});`) as (m: Math, p: typeof prop) => unknown;

            const computed = fn(Math, prop);

            if (computed !== undefined && computed !== null) {
                const def = owner.getDefinitionForProp(propKey);
                let filtered = def?.filterFunction ? def.filterFunction(computed) : computed;
                if (filtered === undefined || filtered === null) {
                    throw new Error('Filtered expression value is undefined or null.');
                }

                filtered = convertType(filtered, def!.type);
                result.current = filtered as T;
            } else {
                result.current = fallbackValue as T;
            }
        } catch (e: unknown) {
            result.error = e instanceof Error ? e.message : String(e);
            result.current = fallbackValue as T;
        }

        return result;
    }

    destroy() {
        // placeholder for user-added per-property teardown
    }
}

export class PropertyContainer {
    children: { [key: string]: PropertyNode };
    collapsed: boolean | undefined;

    owner: InspectableWithProps | undefined;
    keyPath: string | undefined;

    constructor(
        children: { [key: string]: PropertyNode },
        owner?: InspectableWithProps,
        keyPath?: string,
        collapsed?: boolean
    ) {
        this.children = $state(children);
        this.collapsed = $state(collapsed);

        this.owner = owner;
        this.keyPath = keyPath;
    }

    destroy() {
        for (const key in this.children) {
            this.children[key]?.destroy?.();
        }
    }
}

export type PropertyData = Property;
export type PropertyContainerData = PropertyContainer;
export type PropertyNode = Property | PropertyContainer;

export class InspectableWithProps {
    id: string = $state('');
    iType: string = $state('');
    props: { [key: string]: PropertyNode } = $state({});
    definitions = $derived(this.getPropertyDefinitions());

    private _registeredUserID = '';

    defaultUserID: string = $state('');
    userID: string = $derived(this.getPropValue('userID', '').current as string);

    userIDEffectDestroy = $effect.root(() => {
        $effect(() => {
            // this.defaultUserID; //to trigger with this as well
            const nextUserID = this.userID;
            if (nextUserID === this._registeredUserID) return;

            if (this._registeredUserID !== '') {
                unregisterActiveUserID(this._registeredUserID);
            }

            if (nextUserID !== '') {
                registerActiveUserID(nextUserID, this);
            }

            this._registeredUserID = nextUserID;
        });

        return () => {
        };
    });

    constructor(iType: string, id?: string) {
        this.iType = iType;
        this.id = id ?? (iType + '-' + crypto.randomUUID());

    }

    setupProps() {
        this.props = getPropsFromDefinitions(this.definitions || {}, this);
    }

    cleanup() {
        this.userIDEffectDestroy();
        if (this._registeredUserID !== '') {
            unregisterActiveUserID(this._registeredUserID);
            this._registeredUserID = '';
        }
    }

    getUserIDDefinition(): PropertySingleDefinition {
        return {
            name: 'User ID',
            type: PropertyType.STRING,
            default: this.defaultUserID,
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

    getProp(propKey: string): PropertyData | PropertyContainerData | null {

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

    getPropValue<T>(propKey: string, defaultValue = null as T): ResolvedProperty<T> {
        const node = this.getProp(propKey);
        if (!node || 'children' in node) {
            return { current: defaultValue!, raw: defaultValue! };
        }
        return (node as Property).getResolved<T>(defaultValue);
    }

    getPropRawValue(propKey: string, defaultValue: any = null): PropertyValueType | null {
        const node = this.getProp(propKey);
        if (!node || 'children' in node) return defaultValue;
        return (node as Property).getRaw(defaultValue);
    }

    setPropRawValue(propKey: string, value: PropertyValueType) {
        const node = this.getProp(propKey);

        if (node && !('children' in node)) {
            (node as Property).setRaw(value);
        } else {
            console.warn(`Property ${propKey} not found on InspectableWithProps ${this.id}`, this);
        }

    }

    toSnapshot(includeID: boolean = true): any {
        const definitions = this.getPropertyDefinitions() || {};

        const snapshotNode = (
            node: PropertyNode | undefined,
            def: PropertySingleDefinition | PropertyContainerDefinition | undefined
        ): any => {
            if (!node || !def) return undefined;

            if ('children' in node) {
                const containerDef = def as PropertyContainerDefinition;
                if (!containerDef.children) return undefined;
                const childrenSnapshot: any = {};
                for (const childKey of Object.keys(containerDef.children)) {
                    const childSnap = snapshotNode(node.children[childKey], containerDef.children[childKey]);
                    if (childSnap !== undefined) {
                        childrenSnapshot[childKey] = childSnap;
                    }
                }

                const collapsedByDefault = containerDef.collapsedByDefault ?? false;
                const collapsed = node.collapsed !== undefined && node.collapsed !== collapsedByDefault
                    ? node.collapsed
                    : undefined;

                if (Object.keys(childrenSnapshot).length === 0 && collapsed === undefined) return undefined;
                return { collapsed, children: childrenSnapshot };
            }

            // leaf
            const leaf = node as Property;
            const singleDef = def as PropertySingleDefinition;
            const canDisable = !!singleDef.canDisable;
            const isDisabled = leaf.enabled === false || (leaf.enabled === undefined && canDisable);
            const isDefault = !isPropValueOverriden(leaf, singleDef);

            if (canDisable && isDisabled && isDefault) return undefined;

            const out: any = {
                value: $state.snapshot(leaf.value)
            };
            if (leaf.enabled !== undefined) out.enabled = leaf.enabled;
            if (leaf.mode !== undefined) out.mode = leaf.mode;
            if (leaf.expression !== undefined) out.expression = leaf.expression;
            return out;
        };

        const propsSnapshot: any = {};
        for (const key of Object.keys(definitions)) {
            const snap = snapshotNode(this.props[key], definitions[key]);
            if (snap !== undefined) propsSnapshot[key] = snap;
        }

        return {
            id: includeID ? this.id : undefined,
            props: propsSnapshot
        };
    }

    applySnapshot(snapshot: any) {
        if (snapshot === null || snapshot === undefined) return;


        const newID = snapshot.id ?? this.id;
        if (newID !== this.id) {
            this.setID(newID);
        }
        const defs = this.getPropertyDefinitions() || {};
        let initProps = getPropsFromDefinitions(defs, this);

        // Recursively copy values from snapshot.props into initProps, only for keys that exist in initProps


        if (snapshot.props && typeof snapshot.props === 'object') {
            this.applySnapshotToProps(initProps, snapshot.props, defs);
        }

        this.props = initProps;
    }

    setID(newID: string) {
        this.id = newID;
    }

    applySnapshotToProps(
        target: { [key: string]: PropertyNode },
        source: any,
        defs: { [key: string]: (PropertySingleDefinition | PropertyContainerDefinition) } = {}
    ) {
        for (const key of Object.keys(target)) {
            if (!Object.prototype.hasOwnProperty.call(source, key)) continue;

            const targetNode = target[key];
            const sourceNode = source[key];
            const def = defs[key];

            if (!targetNode || !def || !sourceNode || typeof sourceNode !== 'object') continue;

            if ('children' in targetNode) {
                const containerDef = def as PropertyContainerDefinition;
                if (containerDef.children && sourceNode.children) {
                    targetNode.collapsed = sourceNode.collapsed ?? targetNode.collapsed;
                    this.applySnapshotToProps(targetNode.children, sourceNode.children, containerDef.children);
                }
                continue;
            }

            const leaf = targetNode as Property;
            const singleDef = def as PropertySingleDefinition;

            if ('enabled' in sourceNode) leaf.enabled = sourceNode.enabled;
            if ('mode' in sourceNode) leaf.mode = sourceNode.mode;
            if ('expression' in sourceNode) leaf.expression = sourceNode.expression;

            if ('value' in sourceNode) {
                const raw = singleDef.filterFunction ? singleDef.filterFunction(sourceNode.value) : sourceNode.value;
                leaf.value = convertType(raw, singleDef.type);
            }
        }
    }
};


export const activeUserIDs: { [key: string]: InspectableWithProps } = $state({});

export function sanitizeUserID(userID: string): string {
    if (userID == null || userID === '' || userID === undefined) return '';
    return userID.trim().toLocaleLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_\-]/g, '');
}

function registerActiveUserID(userID: string, obj: InspectableWithProps) {
    if (userID == '') return;
    activeUserIDs[userID] = obj;
}

function unregisterActiveUserID(userID: string) {
    if (userID == '') return;
    delete activeUserIDs[userID];
}

export enum PropertyType {
    BOOLEAN = 'boolean',
    FLOAT = 'float',
    INTEGER = 'integer',
    STRING = 'string',
    TEXT = 'text', /* Multiline string */
    COLOR = 'color',
    ENUM = 'enum',
    ICON = 'icon', /* Emoji or icon name */
    CSSSIZE = 'css-size',
    BOUNDS = 'bounds',
    POINT2D = 'point2d',
    POINT3D = 'point3d',
    NONE = ''
}

export enum PropertyMode {
    VALUE = 'value',
    EXPRESSION = 'expression'
}

export type PropertyContainerDefinition = {
    name: string;
    color?: string;
    children?: { [key: string]: (PropertySingleDefinition | PropertyContainerDefinition) };
    collapsedByDefault?: boolean;
}

export type PropertyValueType = number | string | boolean | number[] | Color;

export type PropertySingleDefinition = {
    name: string;
    type: PropertyType;
    canDisable?: boolean;
    readOnly?: boolean;
    default: PropertyValueType;
    description?: string;
    options?: { [key: string]: string }; // For ENUM type
    min?: number; // For RANGE type
    max?: number; // For RANGE type
    step?: number; // For STEPPER type
    filterFunction?: (value: any) => any; // Function to filter/validate the value
};

// NOTE: Property nodes are now classes: `Property` and `PropertyContainer`.

// The resolved structure your  consumes (Runtime)
export type ResolvedProperty<T> = {
    current: T | null; // The actual calculated value (float, hex color, etc.)
    raw: T | null; // The raw value (before calculations)
    error?: string; // If parsing failed
    warning?: string; // If there was a non-fatal issue
};



export const getPropsFromDefinitions = function (
    defProps: { [key: string]: (PropertySingleDefinition | PropertyContainerDefinition) },
    owner?: InspectableWithProps,
    basePath: string = ''
): { [key: string]: PropertyNode } {
    let props: { [key: string]: PropertyNode } = {};

    for (let propKey in defProps) {
        let propDef = defProps[propKey];
        const keyPath = basePath ? `${basePath}.${propKey}` : propKey;
        let propChildren = (propDef as PropertyContainerDefinition).children;
        if (propChildren !== undefined) {
            let childrenProps = getPropsFromDefinitions(propChildren, owner, keyPath);
            props[propKey] = new PropertyContainer(
                childrenProps,
                owner,
                keyPath,
                (propDef as PropertyContainerDefinition).collapsedByDefault
            );
        } else {
            props[propKey] = new Property(propDef as PropertySingleDefinition, owner, keyPath);
        }
    }

    return props;
}


const convertType = function (value: any, targetType: PropertyType): PropertyValueType {
    switch (targetType) {
        case PropertyType.INTEGER:
            return parseInt(value);
        case PropertyType.FLOAT:
            return parseFloat(value);
        case PropertyType.BOOLEAN:
            return Boolean(value);
        case PropertyType.STRING:
        case PropertyType.TEXT:
            return String(value);

        case PropertyType.COLOR:
            return ColorUtil.fromAny(value) as Color;

        default:
            return value;
    }
}

export const isPropValueOverriden = function (prop: PropertyData, def: PropertySingleDefinition): boolean {

    //special types
    switch (def.type) {
        case PropertyType.COLOR:
            return ColorUtil.notEquals(prop.value as Color, def.default as Color);

        default:
            break;
    }

    //array types
    if (Array.isArray(prop.value) && Array.isArray(def.default)) {
        if (prop.value.length !== def.default.length) return true;
        for (let i = 0; i < prop.value.length; i++) {
            if (prop.value[i] !== def.default[i]) return true;
        }
        return false
    }

    //primitive types
    return prop.value !== def.default;
}
