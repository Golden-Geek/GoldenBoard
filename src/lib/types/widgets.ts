import type { Binding } from './binding';

export type LayoutType =
	| 'horizontal'
	| 'vertical'
	| 'fixed-grid'
	| 'smart-grid'
	| 'free'
	| 'tabs'
	| 'accordion';

export type WidgetKind =
	| 'container'
	| 'slider'
	| 'int-stepper'
	| 'text-field'
	| 'color-picker'
	| 'rotary';

export type MetaBindingKey = 'id' | 'type' | 'label';

export interface WidgetBase {
	id: string;
	type: WidgetKind;
	label: string;
	value: Binding;
	props: Record<string, Binding>;
	css?: string;
	meta?: Partial<Record<MetaBindingKey, Binding>>;
}

export interface ContainerWidget extends WidgetBase {
	type: 'container';
	layout: LayoutType;
	children: Widget[];
}

export interface SliderWidget extends WidgetBase {
	type: 'slider';
	props: {
		min: Binding;
		max: Binding;
		step: Binding;
	};
}

export interface IntStepperWidget extends WidgetBase {
	type: 'int-stepper';
	props: {
		step: Binding;
	};
}

export type NumericRepresentation = 'decimal' | 'hexadecimal' | 'time';

export interface TextFieldWidget extends WidgetBase {
	type: 'text-field';
	props: {
		representation: Binding;
		decimals: Binding;
	};
}

export interface ColorPickerWidget extends WidgetBase {
	type: 'color-picker';
}

export interface RotaryWidget extends WidgetBase {
	type: 'rotary';
	props: {
		min: Binding;
		max: Binding;
		step: Binding;
	};
}

export type Widget =
	| ContainerWidget
	| SliderWidget
	| IntStepperWidget
	| TextFieldWidget
	| ColorPickerWidget
	| RotaryWidget;

export interface WidgetTemplate {
	id: string;
	name: string;
	type: WidgetKind;
	payload: Widget;
	summary?: string;
}
