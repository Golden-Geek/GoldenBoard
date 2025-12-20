import { InspectableWithProps, PropertyType, type PropertyContainerDefinition, type PropertySingleDefinition } from "$lib/property/property.svelte";
import { mainState } from "./engine.svelte";

export class GlobalSettings extends InspectableWithProps {
    constructor() {
        super('global-settings', 'Global Settings');
        this.setupProps();
    }

    getPropertyDefinitions(): { [key: string]: (PropertySingleDefinition | PropertyContainerDefinition) } | null {
        return globalWidgetPropertyDefinitions;
    }

    applySnapshot(snapshot: any): void {
        super.applySnapshot(snapshot);
    }
};

const globalWidgetPropertyDefinitions: { [key: string]: (PropertySingleDefinition | PropertyContainerDefinition) } = {

    fullScreenOnLoad: { name: 'Full Screen On Load', type: PropertyType.ENUM, default: 'last', options: { 'last': 'Last State', 'off': 'Off', 'on': 'On' } } as PropertySingleDefinition,
    modeOnLoad: { name: 'Mode On Load', type: PropertyType.ENUM, default: 'last', options: { 'last': 'Last State', 'edit': 'Edit', 'live': 'Live' } } as PropertySingleDefinition
};


export function toGlobalSettingsSnapshot(): any {
    return mainState.globalSettings.toSnapshot();
}

export function applyGlobalSettingsSnapshot(snapshot: any) {
    mainState.globalSettings.applySnapshot(snapshot);
}