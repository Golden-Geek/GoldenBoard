import type Property from "../inspector/PropertyInspector.svelte"


export class InspectableWithProps {
    id: string = $state('');
    iType: string = $state('');
    props: { [key: string]: (PropertyData | PropertyContainerData) } = $state({});

    constructor(iType: string, id?: string) {
        this.iType = iType;
        this.id = id ?? (iType + '-' + crypto.randomUUID());

    }

    setupProps()
    {
        this.props = getPropsFromDefinitions(this.getPropertyDefinitions() || {});
    }

    getPropertyDefinitions(): { [key: string]: (PropertySingleDefinition | PropertyContainerDefinition) } | null {
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

    getPropValue<T>(propKey: string, defaultValue = null as T | null): ResolvedProperty<T>  {
        let prop = this.getProp(propKey) as PropertyData;

        if (prop === null) {
            return { current: defaultValue, raw: defaultValue };
        }

        return { current: prop.value as T, raw: prop.value as T }; // TODO: compute resolved value (bindings, etc.)
    }

    getPropRawValue(propKey: string, defaultValue:any = null): number | string | boolean | number[] | null {
        return (this.getProp(propKey) as PropertyData)?.value || defaultValue;
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
        return {
            id: includeID ? this.id : undefined,
            props: $state.snapshot(this.props)
        };
    }

    applySnapshot(snapshot: any) {
        const newID = snapshot.id ?? this.id;
        if (newID !== this.id) {
            this.setID(newID);
        }
        let initProps = getPropsFromDefinitions(this.getPropertyDefinitions() || {});
        // Merge existing props with snapshot props to ensure all properties are present
        this.props = { ...initProps, ...snapshot.props};
    }

    setID(newID: string) {
        this.id = newID;
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
    children?: { [key: string]: (PropertyDefinition | PropertyContainerDefinition) };
    collapsedByDefault?: boolean;
}

export type PropertySingleDefinition = {
    name: string;
    type: PropertyType;
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
