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

const expressionCache = new Map<string, (context: Record<string, unknown>) => BindingValue>();

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
		let fn = expressionCache.get(code);
		if (!fn) {
			fn = new Function('context', `with (context) { return (${code}); }`) as (
				ctx: Record<string, unknown>
			) => BindingValue;
			expressionCache.set(code, fn);
		}
		return fn(context);
	} catch (error) {
		console.error('Binding expression failed', error);
		return null;
	}
}

export const literal = (value: BindingValue): Binding => ({ kind: 'literal', value });
export const oscBinding = (path: string, transform?: string): Binding => ({ kind: 'osc', path, transform });
export const widgetBinding = (target: string): Binding => ({ kind: 'widget', target });
export const expressionBinding = (code: string): Binding => ({ kind: 'expression', code });
