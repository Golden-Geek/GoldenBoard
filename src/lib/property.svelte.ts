export enum PropertyType {
    FLOAT = 'float',
    INTEGER = 'integer',
    RANGE = 'range',
    STRING = 'string',
    BOOLEAN = 'boolean',
    COLOR = 'color',
    ENUM = 'enum',
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
    children: { [key: string]: (PropertyDefinition | PropertyContainerDefinition) };
    collapsedByDefault?: boolean;
}

export type PropertySingleDefinition = {
    name: string;
    type: PropertyType;
    default: number | string | boolean | number[];
    description?: string;
    options?: Array<string>; // For ENUM type
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
    current: T; // The actual calculated value (float, hex color, etc.)
    error?: string; // If parsing failed
};