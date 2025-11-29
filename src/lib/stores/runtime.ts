import { derived } from 'svelte/store';
import { activeBoard } from '$lib/stores/boards';
import { oscValues } from '$lib/stores/oscquery';
import type { BindingContext } from '$lib/types/binding';
import { traverseWidgets } from '$lib/utils/tree';

export const bindingContext = derived([activeBoard, oscValues], ([$board, $osc]) => {
	const widgetValues: BindingContext['widgetValues'] = {};
	if ($board) {
		traverseWidgets($board.root, (widget) => {
			const entry: Record<string, string | number | boolean | null> = {};
			if (widget.value.kind === 'literal') {
				entry.value = widget.value.value;
			}
			for (const [key, binding] of Object.entries(widget.props ?? {})) {
				if (binding.kind === 'literal') {
					entry[key] = binding.value ?? null;
				}
			}
			widgetValues[widget.id] = entry;
		});
	}
	return {
		oscValues: $osc,
		widgetValues,
		functions: {}
	} satisfies BindingContext;
});
