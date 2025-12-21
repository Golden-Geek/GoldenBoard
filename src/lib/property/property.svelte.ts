import { ColorUtil, type Color } from "./Color.svelte";
import { InspectableWithProps, activeUserIDs } from "./inspectable.svelte";


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



export abstract class PropertyNodeBase<TDefinition extends PropertySingleDefinition | PropertyContainerDefinition> {
    owner: InspectableWithProps | undefined;
    keyPath: string | undefined;
    definition: TDefinition;

    // private _destroyers: Array<() => void> = [];

    constructor(definition: TDefinition, owner?: InspectableWithProps, keyPath?: string) {
        this.definition = definition;
        this.owner = owner;
        this.keyPath = keyPath;
    }

    cleanup() {
    }

    abstract toSnapshot(): any;
    abstract applySnapshot(snapshot: any): void;
    abstract resetToDefault(): void;
}



export class Property extends PropertyNodeBase<PropertySingleDefinition> {
    value: PropertyValueType;
    enabled: boolean | undefined;
    mode: PropertyMode | undefined;
    expression: string | undefined;

    constructor(definition: PropertySingleDefinition, owner?: InspectableWithProps, keyPath?: string) {
        super(definition, owner, keyPath);
        this.value = $state(this.coerce(definition.default));
        this.enabled = $state(undefined);
        this.mode = $state(undefined);
        this.expression = $state(undefined);
    }

    override cleanup() {
        super.cleanup();
    }
    

    getDefinition(): PropertySingleDefinition {
        return this.definition;
    }

    getResolved<T>(defaultValue = null as T): ResolvedProperty<T> {
        const def = this.definition;
        const canDisable = !!def.canDisable;

        let enabled = this.enabled;
        if (enabled === undefined) enabled = !canDisable;

        const fallback = (defaultValue !== null ? defaultValue : (def.default as T)) as T;
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
        const def = this.definition;
        const canDisable = !!def.canDisable;

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

                const node = target.getProp(tKey);
                if (!node || 'children' in node) {
                    throw new Error(
                        `Property '${tKey}' not found on target '${keySplit[0]}' for prop('${key}').`
                    );
                }

                return (node as Property).getResolved<U>(fallback as U).current as U;
            };

            const fn = new Function('Math', 'prop', `return (${js});`) as (m: Math, p: typeof prop) => unknown;

            const computed = fn(Math, prop);

            if (computed !== undefined && computed !== null) {
                const def = this.definition;
                let filtered = def.filterFunction ? def.filterFunction(computed) : computed;
                if (filtered === undefined || filtered === null) {
                    throw new Error('Filtered expression value is undefined or null.');
                }

                filtered = this.coerceToType(filtered, def.type);
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

    toSnapshot(): any {
        const def = this.definition;
        const canDisable = !!def.canDisable;
        const isDisabled = this.enabled === false || (this.enabled === undefined && canDisable);
        const isDefault = !this.isValueOverridden();

        if (canDisable && isDisabled && isDefault) return undefined;

        const out: any = {
            value: $state.snapshot(this.value)
        };
        if (this.enabled !== undefined) out.enabled = this.enabled;
        if (this.mode !== undefined) out.mode = this.mode;
        if (this.expression !== undefined) out.expression = this.expression;
        return out;
    }

    applySnapshot(snapshot: any) {
        if (!snapshot || typeof snapshot !== 'object') return;

        if ('enabled' in snapshot) this.enabled = snapshot.enabled;
        this.mode = snapshot.mode ?? PropertyMode.VALUE;
        if ('expression' in snapshot) this.expression = snapshot.expression;

        if ('value' in snapshot) {
            const raw = this.definition.filterFunction
                ? this.definition.filterFunction(snapshot.value)
                : snapshot.value;
            this.value = this.coerce(raw);
        }
    }

    resetToDefault() {
        this.value = this.coerce(this.definition.default);
        this.enabled = undefined;
        this.mode = undefined;
        this.expression = undefined;
    }

    isValueOverridden(trueIfHasExpression:boolean = true): boolean {
        // special types
        if(trueIfHasExpression && (this.mode === PropertyMode.EXPRESSION || this.expression !== undefined)) return true;

        switch (this.definition.type) {
            case PropertyType.COLOR:
                return ColorUtil.notEquals(this.value as Color, this.definition.default as Color);
            default:
                break;
        }

        // array types
        if (Array.isArray(this.value) && Array.isArray(this.definition.default)) {
            if (this.value.length !== this.definition.default.length) return true;
            for (let i = 0; i < this.value.length; i++) {
                if (this.value[i] !== this.definition.default[i]) return true;
            }
            return false;
        }

        // primitive types
        return this.value !== this.definition.default;
    }

    private coerce(value: any): PropertyValueType {
        return this.coerceToType(value, this.definition.type);
    }

    private coerceToType(value: any, targetType: PropertyType): PropertyValueType {
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
};

export class PropertyContainer extends PropertyNodeBase<PropertyContainerDefinition> {
    children: { [key: string]: PropertyNode };
    collapsed: boolean | undefined;

    constructor(
        definition: PropertyContainerDefinition,
        children: { [key: string]: PropertyNode },
        owner?: InspectableWithProps,
        keyPath?: string,
        collapsed?: boolean
    ) {
        super(definition, owner, keyPath);
        this.children = $state(children);
        this.collapsed = $state(collapsed);
    }

    override cleanup() {
        for (const key in this.children) {
            this.children[key]?.cleanup?.();
        }
        super.cleanup();
    }

    toSnapshot(): any {
        const def = this.definition;
        const childrenDef = def.children ?? {};

        const childrenSnapshot: any = {};
        for (const childKey of Object.keys(childrenDef)) {
            const child = this.children[childKey];
            const snap = child?.toSnapshot?.();
            if (snap !== undefined) {
                childrenSnapshot[childKey] = snap;
            }
        }

        const collapsedByDefault = def.collapsedByDefault ?? false;
        const collapsed =
            this.collapsed !== undefined && this.collapsed !== collapsedByDefault ? this.collapsed : undefined;

        if (Object.keys(childrenSnapshot).length === 0 && collapsed === undefined) return undefined;
        return { collapsed, children: childrenSnapshot };
    }

    applySnapshot(snapshot: any) {
        if (!snapshot || typeof snapshot !== 'object') return;

        if ('collapsed' in snapshot) {
            this.collapsed = snapshot.collapsed;
        }

        const sourceChildren = snapshot.children;
        if (!sourceChildren || typeof sourceChildren !== 'object') return;

        const childrenDef = this.definition.children ?? {};
        for (const childKey of Object.keys(childrenDef)) {
            if (!Object.prototype.hasOwnProperty.call(sourceChildren, childKey)) continue;
            this.children[childKey]?.applySnapshot?.(sourceChildren[childKey]);
        }
    }

    resetToDefault() {
        this.collapsed = undefined;
        for (const key of Object.keys(this.children)) {
            this.children[key]?.resetToDefault?.();
        }
    }
}

export type PropertyNode = Property | PropertyContainer;