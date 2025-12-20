export class InspectableWithProps {
    id: string = $state('');
    iType: string = $state('');
    props: { [key: string]: (PropertyData | PropertyContainerData) } = $state({});
    definitions = $derived(this.getPropertyDefinitions());;

    constructor(iType: string, id?: string) {
        this.iType = iType;
        this.id = id ?? (iType + '-' + crypto.randomUUID());

    }

    setupProps() {

        this.props = getPropsFromDefinitions(this.definitions || {});
    }

    getPropertyDefinitions(): { [key: string]: (PropertySingleDefinition | PropertyContainerDefinition) } | null {
        return null;
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

    getPropValue<T>(propKey: string, defaultValue = null as T | null): ResolvedProperty<T> {
        let prop = this.getProp(propKey) as PropertyData;

        if (prop === null) {
            return { current: defaultValue, raw: defaultValue };
        }

        let enabled = prop.enabled;
        if (enabled == undefined || enabled == false) {
            let def = this.getDefinitionForProp(propKey);

            let canDisable = (def && 'canDisable' in def) ? def.canDisable : false;
            if (enabled == undefined) enabled = !canDisable; //default to enabled if canDisable is false
            if (!enabled) {
                return { current: def!.default as T, raw: def!.default as T };
            }
        }



        return { current: prop.value as T, raw: prop.value as T }; // TODO: compute resolved value (bindings, etc.)
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
                        // Recurse into children
                        const filtered = filterProps(prop.children, def.children);
                        if (Object.keys(filtered).length > 0) {
                            result[key] = { ...prop, children: filtered };
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
                    this.applySnapshotToProps(targetProp.children, sourceProp.children);
                } else if ('value' in targetProp && sourceProp && typeof sourceProp === 'object' && 'value' in sourceProp) {
                    Object.assign(targetProp, sourceProp);
                }
            }
        }
    }
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
    DIRECT = 'direct',
    BINDING = 'binding'
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
};

export type PropertyContainerData = {
    children: { [key: string]: (PropertyData | PropertyContainerData) };
    collapsed?: boolean;
};

export type PropertyData = {
    value: number | string | boolean | number[];
    enabled?: boolean;
    mode?: PropertyMode;
    binding?: string;
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
