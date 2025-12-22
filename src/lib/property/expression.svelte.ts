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
            p: (key?: string, fallback?: unknown) => unknown,
            o: (path: string, fallback?: unknown) => unknown
        ) => unknown)
        | null = null;

    private _setupFor: string | null = null;
    private _setupError: string | null = null;

    private _oscDesiredKeys: Set<string> = new Set();
    private _oscActive: Map<
        string,
        {
            selector: 'default' | 'user';
            userID: string | null;
            address: string;
            server: any;
            callback: (e: any) => void;
        }
    > = new Map();

    constructor() {
        this.mode = $state(undefined);
        this.text = $state(undefined);
    }

    cleanup() {
        this.mode = undefined;
        this.text = undefined;
        this._compiledFor = null;
        this._compiledFn = null;

        this._setupFor = null;
        this._setupError = null;

    }

    disable()
    {
        this.clearOscListeners();
    }

    private parseOscPath(path: string): { selector: 'default' | 'user'; userID: string | null; address: string } {
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

        if (serverID) {
            return { selector: 'user', userID: serverID, address };
        }
        return { selector: 'default', userID: null, address };
    }

    private oscKey(dep: { selector: 'default' | 'user'; userID: string | null; address: string }): string {
        return dep.selector === 'default' ? `default|${dep.address}` : `user:${dep.userID}|${dep.address}`;
    }

    private resolveOscServer(dep: { selector: 'default' | 'user'; userID: string | null }): any | null {
        if (dep.selector === 'user') {
            if (!dep.userID) return null;
            return (activeUserIDs as any)[dep.userID] ?? null;
        }
        return mainState.servers.at(0) ?? null;
    }

    private clearOscListeners() {
        for (const [key, entry] of this._oscActive) {
            try {
                entry.server?.removeNodeListener?.(entry.address, entry.callback);
            } catch {
                // ignore
            }
        }
        this._oscActive.clear();
        this._oscDesiredKeys.clear();
    }

    private tryActivateOscListener(dep: { selector: 'default' | 'user'; userID: string | null; address: string }) {
        const key = this.oscKey(dep);
        if (!this._oscDesiredKeys.has(key)) return;
        if (this._oscActive.has(key)) {
            // If default server changed, rebind.
            const current = this._oscActive.get(key)!;
            if (dep.selector === 'default') {
                const nextServer = this.resolveOscServer(dep);
                if (nextServer && nextServer !== current.server) {
                    try {
                        current.server?.removeNodeListener?.(current.address, current.callback);
                    } catch {
                        // ignore
                    }
                    this._oscActive.delete(key);
                }
            }
            return;
        }

        const server = this.resolveOscServer(dep);
        if (!server) return;

        // Only activate if the node exists in the current address map.
        // If setup happens before structure is ready, osc() runtime will retry later.
        if (!server.addressMap || !server.addressMap[dep.address]) return;

        const cb = (_e: any) => {
            // no-op: listener exists to request LISTEN from server
        };

        server.addNodeListener?.(dep.address, cb);
        this._oscActive.set(key, { selector: dep.selector, userID: dep.userID, address: dep.address, server, callback: cb });
    }

    private syncOscListeners(desiredKeys: Set<string>) {
        // Remove listeners that are no longer referenced
        for (const [key, entry] of this._oscActive) {
            if (!desiredKeys.has(key)) {
                try {
                    entry.server?.removeNodeListener?.(entry.address, entry.callback);
                } catch {
                    // ignore
                }
                this._oscActive.delete(key);
            }
        }

        this._oscDesiredKeys = desiredKeys;

        // Add newly referenced listeners (best-effort; may retry later)
        for (const key of desiredKeys) {
            if (this._oscActive.has(key)) continue;
            const [left, address] = key.split('|');
            if (!address) continue;
            if (left === 'default') {
                this.tryActivateOscListener({ selector: 'default', userID: null, address });
                continue;
            }
            if (left.startsWith('user:')) {
                const userID = left.slice('user:'.length);
                this.tryActivateOscListener({ selector: 'user', userID, address });
            }
        }
    }

    /**
     * Compiles the current expression (if in expression mode) and caches the compiled function.
     * Call this when switching into expression mode or when the expression text changes.
     */
    setup() {
        if (this.mode !== 'expression') {
            this._setupFor = null;
            this._setupError = null;

            this.clearOscListeners();
            return;
        }

        const expr = (this.text ?? '').trim();
        if (expr === '') {
            this._setupFor = null;
            this._setupError = null;

            this.clearOscListeners();
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

    private createOscResolver(): (path: string, fallback?: unknown) => unknown {
        return (path: string, fallback?: unknown) => {
            if (typeof path !== 'string') {
                throw new Error(`osc(path) expects a string path.`);
            }

            const dep = this.parseOscPath(path);
            const key = this.oscKey(dep);
            // Mark dependency for this evaluation. Actual add/remove happens after evaluation.
            this._oscDesiredKeys.add(key);

            const server = this.resolveOscServer(dep);
            if (!server) {
                if (fallback !== undefined) return fallback;
                if (dep.selector === 'user') {
                    throw new Error(`OSC server '${dep.userID}' not found for osc('${path}').`);
                }
                throw new Error(`No OSC server available for osc('${path}').`);
            }

            // Tie reactivity to server lifecycle + updates.
            // - structureReady flips when addressMap is built
            const ready = !!server.structureReady;
            if (!ready) return fallback;

            // If setup ran before the node existed, activate once it's available.
            this.tryActivateOscListener(dep);

            const node = server.getNode?.(dep.address);
            if (!node) {
                // Depend on structure changes so we can re-evaluate when the node appears.
                if (fallback !== undefined) return fallback;
                throw new Error(`OSC node '${dep.address}' not found for osc('${path}').`);
            }

            const value = (node as any).VALUE;
            if (Array.isArray(value)) {
                if (value.length === 0) return fallback;
                if (value.length === 1) return value[0];
                return value;
            }

            if (value === undefined) return fallback;
            return value;
        };
    }

    private createPropResolver(args: {
        owner: InspectableWithProps;
        selfKeyPath: string;
        selfRawValue: unknown;
        visited: Set<string>;
    }): (key?: string, fallback?: unknown) => unknown {
        return (key?: string, fallback?: unknown) => {
            // Special case: prop() with no args returns the raw value of the current property.
            if (key == null || key === '') {
                return args.selfRawValue;
            }

            const keySplit = key.split(':');
            let target: InspectableWithProps | undefined = args.owner;
            let tKey = key;
            if (keySplit.length > 1) {
                const targetId = keySplit[0];
                target = targetId === 'this' || targetId === '' ? args.owner : activeUserIDs[targetId];
                tKey = keySplit[1];
            }

            if (!target) {
                throw new Error(`Target '${keySplit[0]}' not found for prop('${key}').`);
            }

            // prevent obvious circular references
            const circularKey = `${target.id}:${tKey}`;
            if (args.visited.has(circularKey)) {
                throw new Error(`Circular prop() reference detected for '${key}'.`);
            }
            args.visited.add(circularKey);

            if (tKey === args.selfKeyPath && target === args.owner) {
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

        const js = expr.startsWith('=') ? expr.slice(1).trim() : expr;

        this.setup();
        if (this._setupFor === js && this._setupError) {
            result.error = this._setupError;
            result.current = args.fallbackValue;
            return result;
        }

        const visited = new Set<string>();
        // Collect runtime OSC dependencies for this evaluation.
        // We sync listeners after evaluation (diff-based), which also supports dynamic addresses.
        const desiredOscKeys = new Set<string>();
        this._oscDesiredKeys = desiredOscKeys;

        const osc = this.createOscResolver();

        try {
            const prop = this.createPropResolver({
                owner: args.owner,
                selfKeyPath: args.selfKeyPath,
                selfRawValue: args.rawValue,
                visited
            });

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

            this.syncOscListeners(desiredOscKeys);
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

            // Even on error, keep listeners in sync with whatever was referenced.
            this.syncOscListeners(desiredOscKeys);
        }

        return result;
    }
}
