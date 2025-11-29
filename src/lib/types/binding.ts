export type BindingValue = string | number | boolean | null;

export type Binding =
	| { kind: 'literal'; value: BindingValue }
	| { kind: 'osc'; path: string; transform?: string }
	| { kind: 'widget'; target: string }
	| { kind: 'expression'; code: string };

export interface BindingContext {
	oscValues: Record<string, BindingValue>;
	widgetValues: Record<string, Record<string, BindingValue>>;
	functions: Record<string, string>;
}

type ExpressionFn = (context: Record<string, unknown>) => BindingValue;
type ExpressionCacheEntry = { fn: ExpressionFn } | { error: Error };

const expressionCache = new Map<string, ExpressionCacheEntry>();

function annotateExpressionError(error: unknown, code: string): Error {
	const err = error instanceof Error ? error : new Error(String(error));
	Object.defineProperty(err, 'bindingCode', {
		value: code,
		configurable: true,
		enumerable: false,
		writable: true
	});
	return err;
}

function compileExpression(code: string): ExpressionFn {
	const cached = expressionCache.get(code);
	if (cached) {
		if ('fn' in cached) {
			return cached.fn;
		}
		throw cached.error;
	}
	if (!code.trim()) {
		const error = annotateExpressionError(new SyntaxError('Empty expression'), code);
		expressionCache.set(code, { error });
		throw error;
	}
	try {
		const fn = new Function('context', `with (context) { return (${code}); }`) as ExpressionFn;
		expressionCache.set(code, { fn });
		return fn;
	} catch (error) {
		const annotated = annotateExpressionError(error, code);
		expressionCache.set(code, { error: annotated });
		throw annotated;
	}
}

export function resolveBinding(binding: Binding, context: BindingContext): BindingValue {
	switch (binding.kind) {
		case 'literal':
			return binding.value ?? null;
		case 'osc': {
			const value = context.oscValues[binding.path] ?? null;
			if (!binding.transform) {
				return value;
			}
			return runExpression(binding.transform, buildExecutionContext(context, { value }));
		}
		case 'widget': {
			const [widgetId, property = 'value'] = binding.target.split('.');
			return context.widgetValues[widgetId]?.[property] ?? null;
		}
		case 'expression':
			return runExpression(binding.code, buildExecutionContext(context));
	}
}

function buildExecutionContext(
	context: BindingContext,
	extra: Record<string, unknown> = {}
): Record<string, unknown> {
	return {
		osc: context.oscValues,
		widgets: context.widgetValues,
		fns: context.functions,
		...extra
	};
}

function runExpression(code: string, context: Record<string, unknown>): BindingValue {
	try {
		const fn = compileExpression(code);
		return fn(context);
	} catch (error) {
		if (error instanceof Error) {
			const reported = Reflect.get(error, 'bindingReported');
			if (!reported) {
				console.error('Binding expression failed', error);
				Reflect.set(error, 'bindingReported', true);
			}
		} else {
			console.error('Binding expression failed', error);
		}
		return null;
	}
}

export function isExpressionValid(code: string): boolean {
	try {
		compileExpression(code);
		return true;
	} catch {
		return false;
	}
}

export const literal = (value: BindingValue): Binding => ({ kind: 'literal', value });
export const oscBinding = (path: string, transform?: string): Binding => ({ kind: 'osc', path, transform });
export const widgetBinding = (target: string): Binding => ({ kind: 'widget', target });
export const expressionBinding = (code: string): Binding => ({ kind: 'expression', code });
