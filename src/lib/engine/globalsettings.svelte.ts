import { InspectableWithProps, PropertyType, type PropertyContainerDefinition, type PropertyData, type PropertySingleDefinition } from "$lib/property/property.svelte";
import { mainState } from "./engine.svelte";

export class GlobalSettings extends InspectableWithProps {

    fullScreenOnLoad = $derived(this.getPropValue('fullScreenOnLoad').current as string);
    modeOnLoad = $derived(this.getPropValue('modeOnLoad').current as string);
    showBoardsListInLiveMode = $derived(this.getPropValue('showBoardsListInLiveMode').current as boolean);
    hideListIfOnlyOneBoard = $derived(this.getPropValue('hideListIfOnlyOneBoard').current as boolean);


    constructor() {
        super('global-settings', 'Global Settings');
        this.defaultUserID = 'global';
        this.setupProps();
    }

    cleanup() {
        super.cleanup();
    }

    getPropertyDefinitions(): { [key: string]: (PropertySingleDefinition | PropertyContainerDefinition) } | null {
        return { ...super.getPropertyDefinitions(), ...globalWidgetPropertyDefinitions };
    }

    applySnapshot(snapshot: any): void {
        super.applySnapshot(snapshot);
    }
};

const globalWidgetPropertyDefinitions: { [key: string]: (PropertySingleDefinition | PropertyContainerDefinition) } = {

    fullScreenOnLoad: { name: 'Full Screen On Load', type: PropertyType.ENUM, default: 'last', options: { 'last': 'Last State', 'off': 'Off', 'on': 'On' } } as PropertySingleDefinition,
    modeOnLoad: { name: 'Mode On Load', type: PropertyType.ENUM, default: 'last', options: { 'last': 'Last State', 'edit': 'Edit', 'live': 'Live' } } as PropertySingleDefinition,
    showBoardsListInLiveMode: { name: 'Show Boards List In Live Mode', type: PropertyType.BOOLEAN, default: true } as PropertySingleDefinition,
    hideListIfOnlyOneBoard: { name: 'Hide Boards List If Only One Board', type: PropertyType.BOOLEAN, default: true } as PropertySingleDefinition,
};


export function toGlobalSettingsSnapshot(): any {
    return mainState.globalSettings.toSnapshot();
}

export function applyGlobalSettingsSnapshot(snapshot: any) {
    mainState.globalSettings.applySnapshot(snapshot);
}