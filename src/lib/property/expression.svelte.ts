import { mainState, getAllWidgets } from '$lib/engine/engine.svelte';
import { activeUserIDs, sanitizeUserID, type InspectableWithProps } from './inspectable.svelte';
import { PropertyType } from './property.svelte';

export type ExpressionMode = 'value' | 'expression';

export type ExpressionResult<T> = {
    current: T | null;
    raw: T | null;
    error?: string;
    warning?: string;
    binding?: boolean;
};

/**
 * Expression encapsulates expression text, mode, compilation and evaluation.
 *
 * It intentionally does not depend on `Property` to avoid circular imports.
 * It evaluates using an `InspectableWithProps` owner + `getProp()` duck-typing.
 */
export class Expression {
    mode: ExpressionMode | undefined = $state(undefined);
    text: string | undefined = $state(undefined);

    bindingMode: boolean = $state(false);

    private _compiledFor: string | null = null;
    private _compiledFn:
        | ((
            m: Math,
            p: (key?: string, fallback?: unknown) => unknown,
            o: (path: string, fallback?: unknown) => unknown,
            b: (path: string) => unknown
        ) => unknown)
        | null = null;

    private _setupFor: string | null = null;
    private _setupError: string | null = null;

    private _oscDesiredTags: Map<string, 'osc' | 'binding'> = new Map();
    private _oscActive: Map<
        string,
        {
            selector: 'default' | 'user';
            userID: string | null;
            address: string;
            server: any;
            callback: (e: any) => void;
            tag: 'osc' | 'binding';
        }
    > = new Map();

    private _bindingRuntime: {
        setRawFromBinding?: ((value: unknown) => void) | undefined;
        filter?: ((value: unknown) => unknown) | undefined;
        coerce?: ((value: unknown) => unknown) | undefined;
    } | null = null;

    private _oscSyncToken = 0;

    constructor() {
    }

    cleanup() {
        this.mode = undefined;
        this.text = undefined;
        this._compiledFor = null;
        this._compiledFn = null;

        this._setupFor = null;
        this._setupError = null;

        this.clearOscListeners();
    }

    disable() {
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
            let server = (activeUserIDs as any)[dep.userID];
            if (!server) {
                server = mainState.servers.find((s: any) => s.autoID === dep.userID) ?? null;
            }
            return server;
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
        this._oscDesiredTags.clear();
        this.bindingMode = false;
    }

    private setDesiredOscTag(map: Map<string, 'osc' | 'binding'>, key: string, tag: 'osc' | 'binding') {
        const existing = map.get(key);
        // binding wins if both are requested
        if (existing === 'binding') return;
        map.set(key, tag);
    }

    private createOscSolver(args: {
        desiredOscTags: Map<string, 'osc' | 'binding'>;
        tag: 'osc' | 'binding';
        rawValue: unknown;
    }): (path: string, fallback?: unknown) => unknown {
        return (path: string, fallback?: unknown) => {
            if (typeof path !== 'string') {
                throw new Error(`${args.tag}(path) expects a string path.`);
            }

            const dep = this.parseOscPath(path);
            const key = this.oscKey(dep);
            this.setDesiredOscTag(args.desiredOscTags, key, args.tag);

            const server = this.resolveOscServer(dep);
            if (!server) {
                if (fallback !== undefined) return fallback;
                if (dep.selector === 'user') {
                    throw new Error(`OSC server '${dep.userID}' not found for ${args.tag}('${path}').`);
                }
                throw new Error(`No OSC server available for ${args.tag}('${path}').`);
            }

            const ready = !!server.structureReady;
            if (!ready) {
                if (fallback !== undefined) return fallback;
                throw new Error(`OSC structure not ready for ${args.tag}('${path}').`);
            }

            // This reads addressMap internally (deeply reactive in your model).
            const node = server.getNode?.(dep.address);
            if (!node) {
                if (fallback !== undefined) return fallback;
                throw new Error(`OSC node '${dep.address}' not found for ${args.tag}('${path}').`);
            }

            // In binding mode, bind() is purely wiring; expression returns the property's raw value.
            if (args.tag === 'binding') return args.rawValue;

            const scalarOrArray = this.oscArgsToScalarOrArray((node as any).VALUE);
            if (scalarOrArray === undefined) return fallback;
            return scalarOrArray;
        };
    }

    private oscArgsToScalarOrArray(value: any): unknown {
        // OSCQuery stores VALUE as args array.
        if (Array.isArray(value)) {
            if (value.length === 0) return undefined;
            if (value.length === 1) return value[0];
            return value;
        }
        return value;
    }

    private applyIncomingBindingValue(raw: unknown) {
        if (!this._bindingRuntime?.setRawFromBinding) return;

        let next: unknown = raw;
        if (this._bindingRuntime.filter) {
            try {
                next = this._bindingRuntime.filter(next);
            } catch {
                // ignore filter errors
            }
        }

        if (next == null) return;
        if (this._bindingRuntime.coerce) {
            try {
                next = this._bindingRuntime.coerce(next);
            } catch {
                // ignore coerce errors
            }
        }

        this._bindingRuntime.setRawFromBinding(next);
    }

    private tryActivateOscListener(dep: { selector: 'default' | 'user'; userID: string | null; address: string }, tag: 'osc' | 'binding') {
        const key = this.oscKey(dep);
        const desiredTag = this._oscDesiredTags.get(key);
        if (!desiredTag) return;

        // If desired tag differs from requested activation type, ignore.
        if (desiredTag !== tag) return;

        if (this._oscActive.has(key)) {
            // If default server changed, rebind.
            const current = this._oscActive.get(key)!;
            if (current.tag !== tag) {
                try {
                    current.server?.removeNodeListener?.(current.address, current.callback);
                } catch {
                    // ignore
                }
                this._oscActive.delete(key);
            }
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

        const cb = (e: any) => {
            if (!e || e.event !== 'valueChanged') return;
            if (tag !== 'binding') return;
            const scalarOrArray = this.oscArgsToScalarOrArray(e.value);
            if (scalarOrArray === undefined) return;
            this.applyIncomingBindingValue(scalarOrArray);
        };

        server.addNodeListener?.(dep.address, cb);
        this._oscActive.set(key, { selector: dep.selector, userID: dep.userID, address: dep.address, server, callback: cb, tag });
    }

    /* returns if binding should be active or not, to avoid setting the state inside a $derived */
    private syncOscListeners(desiredTags: Map<string, 'osc' | 'binding'>) {
        // Remove listeners that are no longer referenced
        for (const [key, entry] of this._oscActive) {
            const desired = desiredTags.get(key);
            if (!desired || desired !== entry.tag) {
                try {
                    entry.server?.removeNodeListener?.(entry.address, entry.callback);
                } catch {
                    // ignore
                }
                this._oscActive.delete(key);
            }
        }

        this._oscDesiredTags = desiredTags;
        this.bindingMode = Array.from(desiredTags.values()).some((t) => t === 'binding');

        // Add newly referenced listeners (best-effort; may retry later)
        for (const [key, tag] of desiredTags) {
            if (this._oscActive.has(key)) continue;
            const [left, address] = key.split('|');
            if (!address) continue;
            if (left === 'default') {
                this.tryActivateOscListener({ selector: 'default', userID: null, address }, tag);
                continue;
            }
            if (left.startsWith('user:')) {
                const userID = left.slice('user:'.length);
                this.tryActivateOscListener({ selector: 'user', userID, address }, tag);
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
                this._compiledFn = new Function('Math', 'prop', 'osc', 'bind', `return (${js});`) as any;
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

    private requestOscListenerSync(desiredTags: Map<string, 'osc' | 'binding'>) {
        // Expression.evaluate() is frequently called from templates / $derived.
        // OSCQueryClient.addNodeListener/removeNodeListener mutates $state (listeners arrays)
        // which is forbidden during derived/template evaluation (state_unsafe_mutation).
        // Defer add/remove operations to a microtask.
        const snapshot = new Map(desiredTags);
        const token = ++this._oscSyncToken;
        queueMicrotask(() => {
            if (token !== this._oscSyncToken) return;
            this.syncOscListeners(snapshot);
        });
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

                const allWidgets = getAllWidgets();
                for (const w of allWidgets) {
                    console.log(`Checking widget ${w.autoID} against targetId ${keySplit[0]}`);
                    if (w?.autoID === keySplit[0]) {
                        target = w;
                        break;
                    }
                }

                if (!target) {
                    throw new Error(`Target '${keySplit[0]}' not found for prop('${key}').`);
                }
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
        setRawFromBinding?: ((value: T) => void) | undefined;
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
        const desiredOscTags = new Map<string, 'osc' | 'binding'>();
        this._oscDesiredTags = desiredOscTags;

        // Update runtime hooks used by binding callbacks.
        this._bindingRuntime = {
            setRawFromBinding: args.setRawFromBinding ? (v: unknown) => args.setRawFromBinding!(v as T) : undefined,
            filter: args.filter,
            coerce: args.coerce
        };

        const osc = this.createOscSolver({ desiredOscTags, tag: 'osc', rawValue: args.rawValue });
        const bind = this.createOscSolver({ desiredOscTags, tag: 'binding', rawValue: args.rawValue });
        let bindingUsed = false;
        const bindWrapped = (path: string, fallback?: unknown): unknown => {
            bindingUsed = true;
            return bind(path, fallback);
        };

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

            const computed = this._compiledFn(Math, prop, osc, bindWrapped);

            const bindingActive = bindingUsed || Array.from(desiredOscTags.values()).some((t) => t === 'binding');
            if (bindingActive) {
                // Binding mode: return the property's raw value, and treat bind() purely as wiring.
                result.current = args.rawValue;
            } else {
                if (computed !== undefined && computed !== null) {
                    let filtered: unknown = args.filter ? args.filter(computed) : computed;
                    if (filtered === undefined || filtered === null) {
                        throw new Error('Filtered expression value is undefined or null.');
                    }

                    result.current = args.coerce(filtered);
                } else {
                    result.current = args.fallbackValue;
                }
            }

            this.requestOscListenerSync(desiredOscTags);

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
            this.requestOscListenerSync(desiredOscTags);
        }

        return result;
    }

    /**
     * Called by Property when its raw value changes.
     * In binding mode, pushes raw value to all bound OSC nodes (unless change originated from OSC).
     */
    onRawValueChanged(rawValue: unknown, type: PropertyType, source: 'local' | 'binding' = 'local') {
        if (this.mode !== 'expression') return;
        if (!this.bindingMode) return;
        if (source === 'binding') return;

        for (const entry of this._oscActive.values()) {
            if (entry.tag !== 'binding') continue;

            const server = entry.server;
            if (!server) continue;
            if (!server.structureReady) continue;
            const nMap = server.addressMap?.[entry.address];
            if (!nMap) continue;

            server.sendNodeValue(nMap, rawValue);
        }
    }
}
