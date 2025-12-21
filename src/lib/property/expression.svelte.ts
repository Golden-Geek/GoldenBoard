import { activeUserIDs, type InspectableWithProps } from './inspectable.svelte';

export type ExpressionMode = 'value' | 'expression';

export type ExpressionResult<T> = {
    current: T | null;
    raw: T | null;
    error?: string;
    warning?: string;
};

/**
 * Expression encapsulates expression text, mode, compilation and evaluation.
 *
 * It intentionally does not depend on `Property` to avoid circular imports.
 * It evaluates using an `InspectableWithProps` owner + `getProp()` duck-typing.
 */
export class Expression {
    mode: ExpressionMode | undefined;
    text: string | undefined;

    private _compiledFor: string | null = null;
    private _compiledFn: ((m: Math, p: (key: string, fallback?: unknown) => unknown) => unknown) | null =
        null;

    constructor() {
        this.mode = $state(undefined);
        this.text = $state(undefined);
    }

    reset() {
        this.mode = undefined;
        this.text = undefined;
        this._compiledFor = null;
        this._compiledFn = null;
    }

    /**
     * Snapshot format is kept compatible with the legacy `Property` snapshot:
     * - `mode` is optional
     * - `expression` is the expression text
     */
    toSnapshot(): { mode?: ExpressionMode; expression?: string } {
        const out: { mode?: ExpressionMode; expression?: string } = {};
        if (this.mode !== undefined) out.mode = this.mode;
        if (this.text !== undefined) out.expression = this.text;
        return out;
    }

    /**
     * Patch-friendly: only updates fields present on snapshot.
     */
    applySnapshot(snapshot: any) {
        if (!snapshot || typeof snapshot !== 'object') return;

        if ('mode' in snapshot) this.mode = snapshot.mode;
        if ('expression' in snapshot) this.text = snapshot.expression;
    }

    isOverridden(): boolean {
        return this.mode === 'expression' || this.text !== undefined;
    }

    evaluate<T>(args: {
        owner: InspectableWithProps;
        selfKeyPath: string;
        rawValue: T;
        fallbackValue: T;
        coerce: (value: unknown) => T;
        filter?: ((value: unknown) => unknown) | undefined;
    }): ExpressionResult<T> {
        const result: ExpressionResult<T> = {
            current: args.rawValue,
            raw: args.rawValue
        };

        if (this.mode !== 'expression') return result;

        const expr = (this.text ?? '').trim();
        if (expr === '') return result;

        const owner = args.owner;
        const selfKeyPath = args.selfKeyPath;

        const js = expr.startsWith('=') ? expr.slice(1).trim() : expr;

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

        const visited = new Set<string>();

        try {
            const prop = (key: string, fallback?: unknown) => {
                const keySplit = key.split(':');
                let target: InspectableWithProps | undefined = owner;
                let tKey = key;
                if (keySplit.length > 1) {
                    const targetId = keySplit[0];
                    target = targetId === 'this' || targetId === '' ? owner : activeUserIDs[targetId];
                    tKey = keySplit[1];
                }

                if (!target) {
                    throw new Error(`Target '${keySplit[0]}' not found for prop('${key}').`);
                }

                // prevent obvious circular references
                const circularKey = `${target.id}:${tKey}`;
                if (visited.has(circularKey)) {
                    throw new Error(`Circular prop() reference detected for '${key}'.`);
                }
                visited.add(circularKey);

                if (tKey === selfKeyPath && target === owner) {
                    throw new Error(`Expression cannot reference itself: prop('${key}')`);
                }

                const node: any = (target as any).getProp?.(tKey);
                if (!node || 'children' in node || typeof node.getResolved !== 'function') {
                    throw new Error(
                        `Property '${tKey}' not found on target '${keySplit[0]}' for prop('${key}').`
                    );
                }

                return node.getResolved(fallback as any).current;
            };

            if (this._compiledFor !== js) {
                this._compiledFn = new Function('Math', 'prop', `return (${js});`) as any;
                this._compiledFor = js;
            }

            const computed = this._compiledFn!(Math, prop);

            if (computed !== undefined && computed !== null) {
                let filtered: unknown = args.filter ? args.filter(computed) : computed;
                if (filtered === undefined || filtered === null) {
                    throw new Error('Filtered expression value is undefined or null.');
                }

                result.current = args.coerce(filtered);
            } else {
                result.current = args.fallbackValue;
            }
        } catch (e: unknown) {
            result.error = e instanceof Error ? e.message : String(e);
            result.current = args.fallbackValue;
            // invalidate compiled function if it threw at compile-time
            if (result.error?.includes('Unexpected') || result.error?.includes('SyntaxError')) {
                this._compiledFor = null;
                this._compiledFn = null;
            }
        }

        return result;
    }
}
