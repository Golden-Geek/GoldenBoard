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
    _value: PropertyValueType;
    enabled: boolean | undefined = $state(undefined);
    expression: Expression = new Expression()
    bindingMode = $derived(this.expression.bindingMode);

    private _destroy: (() => void) | null = null;

    constructor(definition: PropertySingleDefinition, owner?: InspectableWithProps, keyPath?: string) {
        super(definition, owner, keyPath);
        this._value = $state(this.coerce(definition.default));

        // Keep expression evaluation (and therefore bind()/osc() listener tracking) alive
        // even if the UI isn't currently reading getResolved().
        this._destroy = $effect.root(() => {
            $effect(() => {
                if (this.mode !== PropertyMode.EXPRESSION) return;
                if (!this.owner || !this.keyPath) return;
                // Touch resolved value to establish reactive deps.
                void this.getResolved<any>(this.definition.default as any);
            });
            return () => { };
        });
    }

    override cleanup() {
        super.cleanup();
        this.expression.cleanup();
        this._destroy?.();
        this._destroy = null;
    }


    getDefinition(): PropertySingleDefinition {
        return this.definition;
    }

    get mode(): PropertyMode | undefined {
        return this.expression.mode as PropertyMode | undefined;
    }

    set mode(value: PropertyMode | undefined) {
        this.expression.mode = value as ExpressionMode | undefined;
        if (value === PropertyMode.EXPRESSION) {
            this.expression.setup();
        } else {
            this.expression.disable();
        }
    }

    get expressionValue(): string | undefined {
        return this.expression.text;
    }

    set expressionValue(value: string | undefined) {
        this.expression.text = value;
        if (this.mode === PropertyMode.EXPRESSION) {
            this.expression.setup();
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

        return (this._value as PropertyValueType) ?? defaultValue;
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

        const raw = this._value as T;

        if (this.mode !== PropertyMode.EXPRESSION) {
            return { current: raw, raw };
        }

        if (!this.owner || !this.keyPath) {
            return { current: raw, raw };
        }

        return this.expression.evaluate<T>({
            owner: this.owner,
            selfKeyPath: this.keyPath,
            rawValue: raw,
            fallbackValue: fallback,
            filter: def.filterFunction,
            coerce: (v) => this.coerceToType(v, def.type) as T,
            setRawFromBinding: (v) => {
                this.setRaw(v as any, 'binding');
            }
        });
    }

    setRaw(value: PropertyValueType, source: 'local' | 'binding' = 'local') {
        this._value = value;
        if (this.mode === PropertyMode.EXPRESSION) {
            this.expression.onRawValueChanged(this._value, this.definition.type);
        }
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
            value: $state.snapshot(this._value)
        };
        if (this.enabled !== undefined) out.enabled = this.enabled;
        const exprSnap = this.expression.toSnapshot();
        if (exprSnap.mode !== undefined) out.mode = exprSnap.mode;
        if (exprSnap.expression !== undefined) out.expression = exprSnap.expression;
        return out;
    }

    applySnapshot(snapshot: any) {
        if (!snapshot || typeof snapshot !== 'object') return;

        if ('enabled' in snapshot) this.enabled = snapshot.enabled;
        this.expression.applySnapshot(snapshot);
        if (this.mode === PropertyMode.EXPRESSION) {
            this.expression.setup();
        }

        if ('value' in snapshot) {
            const raw = this.definition.filterFunction
                ? this.definition.filterFunction(snapshot.value)
                : snapshot.value;
            this._value = this.coerce(raw);
        }
    }

    resetToDefault() {
        this._value = this.coerce(this.definition.default);
        this.enabled = undefined;
        this.expression.cleanup();
    }

    isValueOverridden(trueIfHasExpression: boolean = true): boolean {
        // special types
        if (trueIfHasExpression && this.expression.isOverridden()) return true;

        switch (this.definition.type) {
            case PropertyType.COLOR:
                return ColorUtil.notEquals(this._value as Color, this.definition.default as Color);
            default:
                break;
        }

        // array types
        if (Array.isArray(this._value) && Array.isArray(this.definition.default)) {
            if (this._value.length !== this.definition.default.length) return true;
            for (let i = 0; i < this._value.length; i++) {
                if (this._value[i] !== this.definition.default[i]) return true;
            }
            return false;
        }

        // primitive types
        return this._value !== this.definition.default;
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