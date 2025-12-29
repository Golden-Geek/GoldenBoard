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
    /** Marks a container as the user-defined custom properties editor. */
    isCustomProperties?: boolean;
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
    visible?: boolean | ((inspectable: any, property: Property) => boolean); // Whether the property is visible in the UI
    min?: number | ((inspectable: any, property: Property) => number);
    max?: number | ((inspectable: any, property: Property) => number);
    step?: number | ((inspectable: any, property: Property) => number);
    syntax?: 'css' | 'js' | undefined; // For TEXT type, syntax highlighting mode
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

export type WarningError = {
    type: 'warning' | 'error';
    message: string;
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

    private _value: PropertyValueType;

    enabled: boolean | undefined = $state(undefined);
    expression: Expression | undefined = $state(undefined);
    bindingMode = $derived(this.expression?.bindingMode || false);

    warningsAndErrors: { [key: string]: WarningError } = $state({});

    private _destroy: (() => void) | null = null;

    enableEffectDestroy = $effect.root(() => {
        $effect(() => {
            if (!this.enabled) {
                this.expression?.disable();
            }
        });
        return () => {

        };
    });

    rangeEffectDestroy = $effect.root(() => {
        $effect(() => {
            if (this.definition.min || this.definition.max) {
                let min = this.definition.min instanceof Function ? this.definition.min(this.owner, this) : this.definition.min;
                let max = this.definition.max instanceof Function ? this.definition.max(this.owner, this) : this.definition.max;
                let ranged = Math.min(Math.max(this.getRaw() as number, min ?? -Infinity), max ?? Infinity);
                this.set(ranged);
            }
            return () => {

            };
        });
    });


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
        this.expression?.cleanup();
        this._destroy?.();
        this._destroy = null;
        this.enableEffectDestroy();
        this.rangeEffectDestroy();
        this.warningsAndErrors = {};
    }


    getDefinition(): PropertySingleDefinition {
        return this.definition;
    }

    get mode(): PropertyMode | undefined {
        return this.expression?.mode as PropertyMode | PropertyMode.VALUE;
    }

    set mode(value: PropertyMode | undefined) {

        if (value == PropertyMode.EXPRESSION) {
            if (this.expression === undefined) {
                this.expression = new Expression();
            }
        } else if (this.expression?.text === undefined || this.expression.text.trim() === '') {
            this.expression?.cleanup();
            delete this.warningsAndErrors['Expression'];
            this.expression = undefined;
        }

        if (this.expression) {
            this.expression.mode = value as ExpressionMode | undefined;
            if (value === PropertyMode.EXPRESSION) {
                this.expression.setup();
            } else {
                delete this.warningsAndErrors['Expression'];
                this.expression.disable(); 
            }
        }
    }

    get expressionValue(): string | undefined {
        return this.expression?.text;
    }

    set expressionValue(value: string | undefined) {
        if (this.expression === undefined) {
            this.expression = new Expression();
        }

        this.expression!.text = value;
        if (this.mode === PropertyMode.EXPRESSION) {
            this.expression!.mode = PropertyMode.EXPRESSION as ExpressionMode;
            this.expression!.setup();
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

        if (!this.expression) {
            console.warn("Property in expression mode but has no expression?", this);
            return { current: raw, raw, error: 'Internal error: Missing expression.' };
        }

        let result = this.expression!.evaluate<T>({
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

        queueMicrotask(() => {
            let hasWarningOrError = result.error || result.warning;
            if (!hasWarningOrError) {
                delete this.warningsAndErrors['Expression'];
            } else {
                this.warningsAndErrors['Expression'] = { type: result.error ? 'error' : 'warning', message: result.error ?? result.warning ?? '' };
            }
        });

        return result;
    }

    setRaw(value: PropertyValueType, source: 'local' | 'binding' = 'local') {

        const coerced = this.coerce(value);
        let raw = this.definition.filterFunction
            ? this.definition.filterFunction(coerced)
            : coerced;

        if (this.definition.min || this.definition.max) {
            let min = this.definition.min instanceof Function ? this.definition.min(this.owner, this) : this.definition.min;
            let max = this.definition.max instanceof Function ? this.definition.max(this.owner, this) : this.definition.max;
            if (typeof raw === 'number') {
                raw = Math.min(Math.max(raw, min ?? -Infinity), max ?? Infinity);
            }
        }

        this._value = raw;

        if (this.mode === PropertyMode.EXPRESSION) {
            this.expression?.onRawValueChanged(this._value, this.definition.type);
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
        const exprSnap = this.expression?.toSnapshot();
        if (exprSnap?.mode !== undefined) out.mode = exprSnap.mode;
        if (exprSnap?.expression !== undefined) out.expression = exprSnap.expression;
        return out;
    }

    applySnapshot(snapshot: any) {
        if (!snapshot || typeof snapshot !== 'object') return;

        if ('enabled' in snapshot) this.enabled = snapshot.enabled;
        if ('mode' in snapshot) {
            this.mode = snapshot.mode;
        }

        this.expression?.applySnapshot(snapshot);
        if (this.mode === PropertyMode.EXPRESSION) {
            this.expression?.setup();
        }

        if ('value' in snapshot) {
            this.set(this.coerce(snapshot.value));
        }
    }

    resetToDefault() {
        this._value = this.coerce(this.definition.default);
        this.enabled = undefined;
        this.mode = PropertyMode.VALUE;
        this.expression?.cleanup();
        this.expression = undefined;
    }

    isValueOverridden(trueIfHasExpression: boolean = true): boolean {
        // special types
        if (trueIfHasExpression && this.expression?.isOverridden()) return true;

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

    // warningsAndErrors : { warnings : [string | undefined], errors: string | undefined] = $derived.by(
    //     () => {
    //         let result = '';
    //         for (const key of Object.keys(this.children)) {
    //             const child = this.children[key];
    //             if (child instanceof PropertyContainer) {
    //                 let wAndE = (child as PropertyContainer).warningsAndErrors;
    //                 if (child.warningsAndErrors[0]) result.push(child.warningsAndErrors[0]);
    //                 if (child.warningsAndErrors[1]) result.push(child.warningsAndErrors[1]);
    //             } else if (child instanceof Property) {
    //                 const prop = child as Property;
    //                 if (prop.warningsAndErrors[0]) result.push(prop.warningsAndErrors[0]);
    //                 if (prop.warningsAndErrors[1]) result.push(prop.warningsAndErrors[1]);
    //             } 


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

    getAllSingleProps(): Property[] {
        const result: Property[] = [];
        for (const key of Object.keys(this.children)) {
            const child = this.children[key];
            if ('children' in child) {
                result.push(...(child as PropertyContainer).getAllSingleProps());
            } else {
                result.push(child as Property);
            }
        }
        return result;
    }
}

export type PropertyNode = Property | PropertyContainer;