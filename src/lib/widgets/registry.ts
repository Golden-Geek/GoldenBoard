import type { SvelteComponent } from 'svelte';
import SliderWidgetView from '$lib/components/widgets/SliderWidget.svelte';
import IntStepperWidgetView from '$lib/components/widgets/IntStepperWidget.svelte';
import TextFieldWidgetView from '$lib/components/widgets/TextFieldWidget.svelte';
import ColorPickerWidgetView from '$lib/components/widgets/ColorPickerWidget.svelte';
import RotaryWidgetView from '$lib/components/widgets/RotaryWidget.svelte';
import ToggleWidgetView from '$lib/components/widgets/ToggleWidget.svelte';
import CheckboxWidgetView from '$lib/components/widgets/CheckboxWidget.svelte';
import ButtonWidgetView from '$lib/components/widgets/ButtonWidget.svelte';
import MomentaryButtonWidgetView from '$lib/components/widgets/MomentaryButtonWidget.svelte';
import type {
	Widget,
	WidgetKind,
	SliderWidget,
	IntStepperWidget,
	TextFieldWidget,
	ColorPickerWidget,
	RotaryWidget,
	ToggleWidget,
	CheckboxWidget,
	ButtonWidget,
	MomentaryButtonWidget
} from '$lib/types/widgets';
import type { BindingContext, BindingValue } from '$lib/types/binding';
import { literal } from '$lib/types/binding';
import { createId } from '$lib/utils/ids';

export type WidgetPresentation = 'inline' | 'slider' | 'button-block';

export type WidgetRenderContext = {
	widget: Widget;
	ctx: BindingContext;
	value: BindingValue;
	isEditMode: boolean;
	label: string;
	handleValueInput: (value: number | string | boolean) => void;
	handleStringInput: (value: string) => void;
};

export type WidgetComponent = new (...args: any[]) => SvelteComponent;

export interface WidgetDefinition<K extends WidgetKind = WidgetKind> {
	kind: K;
	label: string;
	icon: string;
	create: () => Widget;
	component?: WidgetComponent;
	presentation?: WidgetPresentation;
	showInToolbar?: boolean;
	componentProps?: (context: WidgetRenderContext) => Record<string, unknown>;
}

const definitions: WidgetDefinition[] = [
	{
		kind: 'container',
		label: 'Container',
		icon: '▣',
		presentation: 'inline',
		create: () => ({
			id: createId('container'),
			type: 'container',
			label: 'Container',
			value: literal(null),
			props: { showLabel: literal(true) },
			layout: 'vertical',
			css: '',
			children: []
		})
	},
	{
		kind: 'slider',
		label: 'Slider',
		icon: '⎯',
		presentation: 'slider',
		component: SliderWidgetView,
		create: () => ({
			id: createId('slider'),
			type: 'slider',
			label: 'Slider',
			value: literal(0),
			props: {
				min: literal(0),
				max: literal(1),
				step: literal(0.01)
			},
			css: ''
		}),
		componentProps: ({ widget, ctx, value, isEditMode, label, handleValueInput }) => ({
			widget: widget as SliderWidget,
			ctx,
			value,
			isEditMode,
			label,
			onChange: handleValueInput
		})
	},
	{
		kind: 'int-stepper',
		label: 'Stepper',
		icon: '±',
		presentation: 'inline',
		component: IntStepperWidgetView,
		create: () => ({
			id: createId('stepper'),
			type: 'int-stepper',
			label: 'Stepper',
			value: literal(0),
			props: {
				step: literal(1)
			},
			css: ''
		}),
		componentProps: ({ widget, ctx, value, isEditMode, handleValueInput }) => ({
			widget: widget as IntStepperWidget,
			ctx,
			value,
			isEditMode,
			onChange: handleValueInput
		})
	},
	{
		kind: 'text-field',
		label: 'Text',
		icon: '𝚊',
		presentation: 'inline',
		component: TextFieldWidgetView,
		create: () => ({
			id: createId('text'),
			type: 'text-field',
			label: 'Text',
			value: literal('0'),
			props: {
				representation: literal('decimal'),
				decimals: literal(2)
			},
			css: ''
		}),
		componentProps: ({ isEditMode, value, handleStringInput }) => ({
			isEditMode,
			value: value ?? '',
			onInput: handleStringInput
		})
	},
	{
		kind: 'color-picker',
		label: 'Color',
		icon: '◎',
		presentation: 'inline',
		component: ColorPickerWidgetView,
		create: () => ({
			id: createId('color'),
			type: 'color-picker',
			label: 'Color',
			value: literal('#ffffff'),
			props: {},
			css: ''
		}),
		componentProps: ({ isEditMode, value, handleStringInput }) => ({
			isEditMode,
			value: (value as string | null) ?? '#ffffff',
			onInput: handleStringInput
		})
	},
	{
		kind: 'rotary',
		label: 'Rotary',
		icon: '⟳',
		presentation: 'inline',
		component: RotaryWidgetView,
		create: () => ({
			id: createId('rotary'),
			type: 'rotary',
			label: 'Rotary',
			value: literal(0),
			props: {
				min: literal(0),
				max: literal(1),
				step: literal(0.01)
			},
			css: ''
		}),
		componentProps: ({ widget, ctx, value, isEditMode, handleValueInput }) => ({
			widget: widget as RotaryWidget,
			ctx,
			value,
			isEditMode,
			onChange: handleValueInput
		})
	},
	{
		kind: 'toggle',
		label: 'Toggle',
		icon: '⭘',
		presentation: 'inline',
		component: ToggleWidgetView,
		create: () => ({
			id: createId('toggle'),
			type: 'toggle',
			label: 'Toggle',
			value: literal(false),
			props: {},
			css: ''
		}),
		componentProps: ({ widget, isEditMode, value, label, handleValueInput }) => ({
			widget: widget as ToggleWidget,
			isEditMode,
			value,
			label,
			onChange: handleValueInput
		})
	},
	{
		kind: 'checkbox',
		label: 'Checkbox',
		icon: '☑',
		presentation: 'inline',
		component: CheckboxWidgetView,
		create: () => ({
			id: createId('checkbox'),
			type: 'checkbox',
			label: 'Checkbox',
			value: literal(false),
			props: {},
			css: ''
		}),
		componentProps: ({ widget, isEditMode, value, label, handleValueInput }) => ({
			widget: widget as CheckboxWidget,
			isEditMode,
			value,
			label,
			onChange: handleValueInput
		})
	},
	{
		kind: 'button',
		label: 'Button',
		icon: '⬚',
		presentation: 'button-block',
		component: ButtonWidgetView,
		create: () => ({
			id: createId('button'),
			type: 'button',
			label: 'Button',
			value: literal(false),
			props: {},
			css: ''
		}),
		componentProps: ({ widget, isEditMode, value, label, handleValueInput }) => ({
			widget: widget as ButtonWidget,
			isEditMode,
			value,
			label,
			onChange: handleValueInput
		})
	},
	{
		kind: 'momentary-button',
		label: 'Trigger',
		icon: '●',
		presentation: 'button-block',
		component: MomentaryButtonWidgetView,
		create: () => ({
			id: createId('momentary'),
			type: 'momentary-button',
			label: 'Trigger',
			value: literal(false),
			props: {},
			css: ''
		}),
		componentProps: ({ widget, isEditMode, value, label, handleValueInput }) => ({
			widget: widget as MomentaryButtonWidget,
			isEditMode,
			value,
			label,
			onChange: handleValueInput
		})
	}
];

export const widgetRegistry: Record<WidgetKind, WidgetDefinition> = definitions.reduce(
	(result, definition) => {
		result[definition.kind] = definition;
		return result;
	},
	{} as Record<WidgetKind, WidgetDefinition>
);

export const widgetDefinitions = definitions;
