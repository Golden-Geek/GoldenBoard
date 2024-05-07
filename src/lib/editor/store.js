import { get, writable } from 'svelte/store';
import Container from './components/containers/Container.svelte';
import Slider from './components/parameters/Slider.svelte';
import Button from './components/parameters/Button.svelte';
import { SetAction, transactionCtrl, undoStack } from '@gira-de/svelte-undo';

export const selectedComponents = writable([]);
export const editMode = writable(true);
export const inspectorOpen = writable(true);
export const outlinerOpen = writable(true);

export const dragContainerSource = writable(null);

export const Layouts = Object.freeze({
    FREE: 'free',
    HORIZONTAL: "horizontal",
    VERTICAL: "vertical",
    GRID: "grid"
});

export const ComponentTypes = Object.freeze({
    "container": { name: "Container", type: Container },
    "slider": { name: "Slider", type: Slider },
    "button": { name: "Button", type: Button },
    "rotary": { name: "Rotary", type: Slider },
    "select": { name: "Select", type: Slider },
    "padxy": { name: "Pad XY", type: Slider },
    "padxyz": { name: "Pad XYZ", type: Slider }
});

export const undo = new undoStack("Undo stack init");
export let startLayout = null;

export const layout = writable(
    {
        main:
        {
            id: "main",
            type: "container",
            options: {
                label: "Main",
                layout: Layouts.HORIZONTAL,
                style:
                {
                    'gap': '10px'
                }
            },
            children:
                [
                    {
                        type: "container",
                        id: "container1",
                        options: {
                            label: "Container 1",
                            layout: Layouts.VERTICAL,
                            style:
                            {

                            }
                        },
                        children: [
                            {
                                type: "container",
                                id: "container1.1",
                                options: {
                                    label: "Container 1.1",
                                    layout: Layouts.FREE,
                                    style:
                                    {
                                        size: '400px',
                                        shrink: '0'
                                    }
                                },
                                children: [
                                    {
                                        type: "button",
                                        id: "button1.1",
                                        options: {
                                            label: "Button 1.1",
                                            style:
                                            {
                                                left: '10%',
                                                top: '10px',
                                                width: '80%',
                                                height: '50px'
                                            }
                                        }

                                    },
                                    {
                                        type: "slider",
                                        id: "slider1.1",
                                        options: {
                                            label: "Slider 1.1",
                                            style:
                                            {
                                                left: '150px',
                                                top: '80px',
                                                width: '100px',
                                                height: '20px'
                                            }
                                        }
                                    }
                                ]
                            },
                            {
                                type: "button",
                                id: "button1",
                                options: {
                                    label: "Button 1",
                                    style:
                                    {

                                    }
                                }
                            },
                            {
                                type: "slider",
                                id: "slider1",
                                options: {
                                    label: "Slider 1",
                                    style:
                                    {
                                    }
                                }
                            }
                        ]
                    },
                    {
                        type: "container",
                        id: "container2",
                        options: {
                            label: "Container 2",
                            layout: Layouts.GRID,
                            style:
                            {
                                // gap: '5px'
                            },
                            customCSS: "background-color: #a26555; padding: 20px; border-radius: 10px;"
                        },
                        children: [
                            {
                                type: "button",
                                id: "button2",
                                options: {
                                    label: "Button 2"
                                }
                            },
                            {
                                type: "button",
                                id: "button3",
                                options: {
                                    label: "Button 3"
                                }
                            },
                            {
                                type: "slider",
                                id: "slider2",
                                options: {
                                    label: "Slider 2"
                                }
                            }
                        ]
                    }
                ]
        }
    });

export const getComponentWithId = (component, id, recursive = true) => {
    if (component.id == id) {
        return component;
    }
    else if (recursive && component.children) {
        for (let i = 0; i < component.children.length; i++) {
            let result = getComponentWithId(component.children[i], id, true);
            if (result) {
                return result;
            }
        }
    }
    return null;
}


export const getParentWithChildId = (component, childId) => {
    if (component.children) {
        for (let i = 0; i < component.children.length; i++) {
            if (component.children[i].id == childId) return component;
            let result = getParentWithChildId(component.children[i], id);
            if (result) {
                return result;
            }
        }
    }
    return null;
}

export const startUpdateComponent = () => {
    startLayout = JSON.parse(JSON.stringify(get(layout)));
}

export const updateComponent = (id, newData) => {
    // if (tempLayout == null) startUpdateComponent();

    // let component = getComponentWithId(get(layout).main, id);
    // if (component) {
    //     Object.assign(component, newData);
    // } else {
    //     console.warn("Component not found", id);
    // }
}

export const finishUpdateComponent = () => {
    if (startLayout == null) {
        console.warn("No start layout found");
        return;
    }

    let newLayout = JSON.parse(JSON.stringify(get(layout)));
    get(layout).main = startLayout.main;

    let a = new SetAction(layout, newLayout, "Update components");
    a.apply();
    undo.push(a);
    startLayout = null;
}

export const selectComponent = (id, addRemoveMode) => {

    if (addRemoveMode) {
        let sel = get(selectedComponents);
        if (!sel.includes(id)) {
            sel.push(id);
        } else {
            sel = sel.filter((id) => id != id);
        }
        selectedComponents.set(sel);
    } else {
        selectedComponents.set([id]);
    }
};
