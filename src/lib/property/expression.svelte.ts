import { mainState } from '$lib/engine/engine.svelte';
import { activeUserIDs, sanitizeUserID, type InspectableWithProps } from './inspectable.svelte';

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
    private _compiledFn:
        | ((
            m: Math,
            p: (key: string, fallback?: unknown) => unknown,
            o: (path: string, fallback?: unknown) => unknown
        ) => unknown)
        | null = null;

    private _setupFor: string | null = null;
    private _setupError: string | null = null;

    constructor() {
        this.mode = $state(undefined);
        this.text = $state(undefined);
    }

    reset() {
        this.mode = undefined;
        this.text = undefined;
        this._compiledFor = null;
        this._compiledFn = null;

        this._setupFor = null;
        this._setupError = null;
    }

    /**
     * Compiles the current expression (if in expression mode) and caches the compiled function.
     * Call this when switching into expression mode or when the expression text changes.
     */
    setup() {
        if (this.mode !== 'expression') {
            this._setupFor = null;
            this._setupError = null;
            return;
        }

        const expr = (this.text ?? '').trim();
        if (expr === '') {
            this._setupFor = null;
            this._setupError = null;
            return;
        }

        const js = expr.startsWith('=') ? expr.slice(1).trim() : expr;
        if (this._setupFor === js) return;

        this._setupFor = js;
        this._setupError = null;

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
            this._setupError = 'Expression contains forbidden syntax.';
            return;
        }

        try {
            if (this._compiledFor !== js) {
                this._compiledFn = new Function('Math', 'prop', 'osc', `return (${js});`) as any;
                this._compiledFor = js;
            }
        } catch (e: unknown) {
            const msg = e instanceof Error ? e.message : String(e);
            this._setupError = msg;
            this._compiledFor = null;
            this._compiledFn = null;
        }
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

        this.setup();
        if (this._setupFor === js && this._setupError) {
            result.error = this._setupError;
            result.current = args.fallbackValue;
            return result;
        }

        const visited = new Set<string>();

        const osc = (path: string, fallback?: unknown) => {
            if (typeof path !== 'string') {
                throw new Error(`osc(path) expects a string path.`);
            }

            let serverID = '';
            let address = path.trim();

            // Support: osc('server:/path/to/node')
            const match = /^([^:]+):(\/.*)$/.exec(address);
            if (match) {
                serverID = sanitizeUserID(match[1]);
                address = match[2];
            }

            if (!address.startsWith('/')) {
                address = '/' + address;
            }

            let server: any = null;

            if (serverID) {
                server = (activeUserIDs as any)[serverID] ?? null;
                if (!server) {
                    if (fallback !== undefined) return fallback;
                    throw new Error(`OSC server '${serverID}' not found for osc('${path}').`);
                }
            } else {
                server = mainState.servers.at(0);
                if (!server) {
                    if (fallback !== undefined) return fallback;
                    throw new Error(`No OSC server available for osc('${path}').`);
                }
            }

            // Tie reactivity to server lifecycle + updates.
            // - structureReady flips when addressMap is built
            // - nodeRevisions[address] increments when that node updates
            // - structureRevision increments only when structure is rebuilt/changed
            const ready = !!server.structureReady;
            if (!ready) return fallback;

            const node = server.getNode?.(address);
            if (!node) {
                // Depend on structure changes so we can re-evaluate when the node appears.
                void server.structureRevision;
                if (fallback !== undefined) return fallback;
                throw new Error(`OSC node '${address}' not found for osc('${path}').`);
            }

            // Depend on the specific node updates only.
            void server.nodeRevisions?.[address];

            const value = (node as any).VALUE;
            if (Array.isArray(value)) {
                if (value.length === 0) return fallback;
                if (value.length === 1) return value[0];
                return value;
            }

            if (value === undefined) return fallback;
            return value;
        };

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

            if (this._compiledFor !== js || !this._compiledFn) {
                // Defensive fallback: should have been compiled in setup()
                this.setup();
            }

            if (!this._compiledFn) {
                throw new Error('Expression is not compiled.');
            }

            const computed = this._compiledFn(Math, prop, osc);

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

            // If we get a syntax error, force re-setup next time.
            if (result.error?.includes('Unexpected') || result.error?.includes('SyntaxError')) {
                this._setupFor = null;
                this._setupError = null;
                this._compiledFor = null;
                this._compiledFn = null;
            }
        }

        return result;
    }
}
