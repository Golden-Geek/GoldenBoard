import { ColorUtil, type Color } from "./Color.svelte";
import { InspectableWithProps } from "./inspectable.svelte";
import { Expression, type ExpressionMode } from "./expression.svelte";


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
    expr: Expression;

    constructor(definition: PropertySingleDefinition, owner?: InspectableWithProps, keyPath?: string) {
        super(definition, owner, keyPath);
        this.value = $state(this.coerce(definition.default));
        this.enabled = $state(undefined);

		this.expr = new Expression();
    }

    override cleanup() {
        super.cleanup();
        this.expr.cleanup();
    }
    

    getDefinition(): PropertySingleDefinition {
        return this.definition;
    }

    get mode(): PropertyMode | undefined {
        return this.expr.mode as PropertyMode | undefined;
    }

    set mode(value: PropertyMode | undefined) {
        this.expr.mode = value as ExpressionMode | undefined;
		if (value === PropertyMode.EXPRESSION) {
			this.expr.setup();
		}else {
           this.expr.disable();
        }
    }

    get expression(): string | undefined {
        return this.expr.text;
    }

    set expression(value: string | undefined) {
        this.expr.text = value;
		if (this.mode === PropertyMode.EXPRESSION) {
			this.expr.setup();
		}
    }

    get<T>(defaultValue = null as T): T | null {
        return this.getResolved<T>(defaultValue).current;
    }

    getRaw(defaultValue: any = null): PropertyValueType | null {
        const def = this.definition;
        const canDisable = !!def.canDisable;

        let enabled = this.enabled;
        if (enabled === undefined) enabled = !canDisable;
        if (!enabled) return defaultValue;

        return (this.value as PropertyValueType) ?? defaultValue;
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

        if (this.mode !== PropertyMode.EXPRESSION) {
            return { current: raw, raw };
        }

        if (!this.owner || !this.keyPath) {
            return { current: raw, raw };
        }

        return this.expr.evaluate<T>({
            owner: this.owner,
            selfKeyPath: this.keyPath,
            rawValue: raw,
            fallbackValue: fallback,
            filter: def.filterFunction,
            coerce: (v) => this.coerceToType(v, def.type) as T
        });
    }

    setRaw(value: PropertyValueType) {
        this.value = value;
    }

    set(value: PropertyValueType) {
        this.setRaw(value);
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
		const exprSnap = this.expr.toSnapshot();
		if (exprSnap.mode !== undefined) out.mode = exprSnap.mode;
		if (exprSnap.expression !== undefined) out.expression = exprSnap.expression;
        return out;
    }

    applySnapshot(snapshot: any) {
        if (!snapshot || typeof snapshot !== 'object') return;

        if ('enabled' in snapshot) this.enabled = snapshot.enabled;
		this.expr.applySnapshot(snapshot);
		if (this.mode === PropertyMode.EXPRESSION) {
			this.expr.setup();
		}

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
		this.expr.cleanup();
    }

    isValueOverridden(trueIfHasExpression:boolean = true): boolean {
        // special types
		if (trueIfHasExpression && this.expr.isOverridden()) return true;

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