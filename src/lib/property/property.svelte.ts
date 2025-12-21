export class InspectableWithProps {
    id: string = $state('');
    iType: string = $state('');
    props: { [key: string]: (PropertyData | PropertyContainerData) } = $state({});
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
        this.props = getPropsFromDefinitions(this.definitions || {});
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
        let prop = this.getProp(propKey) as PropertyData;

        if (prop === null) {
            return { current: defaultValue!, raw: defaultValue! };
        }

        let enabled = prop.enabled;

        if (enabled == undefined || enabled == false) {
            let def = this.getDefinitionForProp(propKey);

            let fallback = defaultValue !== null ? defaultValue : def?.default as T;
            if (propKey === 'userID' && fallback === '') {
            }
            let canDisable = (def && 'canDisable' in def) ? def.canDisable : false;
            if (enabled == undefined) enabled = !canDisable; //default to enabled if canDisable is false
            if (!enabled) {
                return { current: fallback, raw: fallback };
            }
        }

        // For now, just return the raw value. TODO: implement expression evaluation, etc.
        if (!prop.mode || prop.mode === PropertyMode.VALUE) {
            return { current: prop.value as T, raw: prop.value as T };
        }
        // return { current: prop.value as T, raw: prop.value as T };

        return this.parseExpression(prop.expression || '', prop.value, propKey);
    }

    getPropRawValue(propKey: string, defaultValue: any = null): number | string | boolean | number[] | null {
        let prop = this.getProp(propKey) as PropertyData;
        if ((prop?.enabled ?? true) === false) {
            return defaultValue;
        }
        return prop?.value || defaultValue;
    }

    setPropRawValue(propKey: string, value: number | string | boolean | number[]) {
        let prop = this.getProp(propKey) as PropertyData;

        if (prop !== null) {
            prop.value = value;
        } else {
            console.warn(`Property ${propKey} not found on InspectableWithProps ${this.id}`, this);
        }

    }


    parseExpression<T>(expression: string, fallbackValue: any, propKey: string): ResolvedProperty<T> {

        let result = {} as ResolvedProperty<T>;

        result.current = fallbackValue as T;
        result.raw = fallbackValue as T;

        const expr = (expression ?? '').trim();
        if (expr === '') return result;

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
                if (keySplit.length == 1)
                    return this.getPropValue<U>(key, fallback as U).current as U;

                let uID = keySplit[0];
                let tKey = keySplit.slice(1).join(':');

                const obj = activeUserIDs[uID];
                if (obj) {
                    return obj.getPropValue<U>(tKey, fallback as U).current as U;
                }
            };

            const fn = new Function('Math', 'prop', `return (${js});`) as (m: Math, p: typeof prop) => unknown;

            const computed = fn(Math, prop);

            if (computed !== undefined && computed !== null) {
                const def = this.getDefinitionForProp(propKey);
                const filtered = def?.filterFunction ? def.filterFunction(computed) : computed;

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

    toSnapshot(includeID: boolean = true): any {

        let snapshot = $state.snapshot(this.props)

        // Remove props that are disabled and have the same value as the definition
        const definitions = this.getPropertyDefinitions() || {};
        function filterProps(props: any, defs: any): any {
            const result: any = Array.isArray(props) ? [] : {};
            for (const key in props) {
                if (!Object.prototype.hasOwnProperty.call(props, key)) continue;
                const prop = props[key];
                const def = defs[key];
                if (prop && def) {
                    if ('children' in prop && def.children) {

                        const filtered = filterProps(prop.children, def.children);

                        let collapsed = undefined
                        if (prop.collapsed !== undefined && prop.collapsed != def.collapsedByDefault) {
                            collapsed = prop.collapsed;
                        }

                        if (Object.keys(filtered).length > 0) {
                            result[key] = { ...prop, collapsed, children: filtered };
                        }


                    } else if ('value' in prop && 'default' in def) {
                        const canDisable = !!def.canDisable;
                        const isDisabled = prop.enabled === false || prop.enabled === undefined && canDisable;
                        const isDefault = prop.value === def.default;
                        if (!(canDisable && isDisabled && isDefault)) {
                            result[key] = { ...prop };
                        }
                    }
                }
            }
            return result;
        }
        snapshot = filterProps(snapshot, definitions);

        return {
            id: includeID ? this.id : undefined,
            props: snapshot
        };
    }

    applySnapshot(snapshot: any) {
        if (snapshot === null || snapshot === undefined) return;


        const newID = snapshot.id ?? this.id;
        if (newID !== this.id) {
            this.setID(newID);
        }
        let initProps = getPropsFromDefinitions(this.getPropertyDefinitions() || {});

        // Recursively copy values from snapshot.props into initProps, only for keys that exist in initProps


        if (snapshot.props && typeof snapshot.props === 'object') {
            this.applySnapshotToProps(initProps, snapshot.props);
        }

        this.props = initProps;
    }

    setID(newID: string) {
        this.id = newID;
    }

    applySnapshotToProps(
        target: { [key: string]: PropertyData | PropertyContainerData },
        source: { [key: string]: PropertyData | PropertyContainerData }
    ) {
        for (const key in target) {
            if (Object.prototype.hasOwnProperty.call(source, key)) {
                const targetProp = target[key];
                const sourceProp = source[key];
                if ('children' in targetProp && sourceProp && typeof sourceProp === 'object' && 'children' in sourceProp) {
                    targetProp.collapsed = sourceProp.collapsed ?? targetProp.collapsed;
                    this.applySnapshotToProps(targetProp.children, sourceProp.children);
                } else if ('value' in targetProp && sourceProp && typeof sourceProp === 'object' && 'value' in sourceProp) {
                    Object.assign(targetProp, sourceProp);
                }
            }
        }
    }
};


export const activeUserIDs: { [key: string]: InspectableWithProps } = $state({});

export function sanitizeUserID(userID: string): string {
    if (userID == null) return '';
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

export type PropertySingleDefinition = {
    name: string;
    type: PropertyType;
    canDisable?: boolean;
    readOnly?: boolean;
    default: number | string | boolean | number[];
    description?: string;
    options?: { [key: string]: string }; // For ENUM type
    min?: number; // For RANGE type
    max?: number; // For RANGE type
    step?: number; // For STEPPER type
    filterFunction?: (value: any) => any; // Function to filter/validate the value
};

export type PropertyContainerData = {
    children: { [key: string]: (PropertyData | PropertyContainerData) };
    collapsed?: boolean;
};

export type PropertyData = {
    value: number | string | boolean | number[];
    enabled?: boolean;
    mode?: PropertyMode;
    expression?: string;
};

// The resolved structure your  consumes (Runtime)
export type ResolvedProperty<T> = {
    current: T | null; // The actual calculated value (float, hex color, etc.)
    raw: T | null; // The raw value (before calculations)
    error?: string; // If parsing failed
};



export const getPropsFromDefinitions = function (defProps: { [key: string]: (PropertyDefinition | PropertyContainerDefinition) }): { [key: string]: (PropertyData | PropertyContainerData) } {
    let props: { [key: string]: (PropertyData | PropertyContainerData) } = {};

    for (let propKey in defProps) {
        let propDef = defProps[propKey];
        let propChildren = (propDef as PropertyContainerDefinition).children;
        if (propChildren !== undefined) {
            let childrenProps = getPropsFromDefinitions(propChildren);
            props[propKey] = { name: propDef.name, children: childrenProps } as PropertyContainerData;
        } else {
            props[propKey] = { value: (propDef as PropertySingleDefinition).default } as PropertyData;

        }
    }

    return props;
}
