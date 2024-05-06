import { get, writable } from 'svelte/store';
import Container from './components/containers/Container.svelte';
import Slider from './components/parameters/Slider.svelte';
import Button from './components/parameters/Button.svelte';

export const selectedComponents = writable([]);
export const editMode = writable(true);
export const inspectorOpen = writable(true);
export const outlinerOpen = writable(true);

export const Layouts = Object.freeze({
    FREE: 'free',
    HORIZONTAL: "horizontal",
    VERTICAL: "vertical",
    GRID: "grid"
});

export const ComponentTypes = Object.freeze({
    "container": {name:"Container", type: Container},
    "slider": {name:"Slider", type: Slider},
    "button": {name:"Button", type: Button},
    "rotary": {name:"Rotary", type: Slider},
    "select": {name:"Select", type: Slider},
    "padxy": {name:"Pad XY", type: Slider},
    "padxyz": {name:"Pad XYZ", type: Slider}
});


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
                                gap: '20px'
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

export function getComponentWithId(id) {
    return getComponentWithIdRecursive(get(layout).main, id);
}

function getComponentWithIdRecursive(component, id) {
    if (component.id == id) {
        return component;
    }
    else if (component.children) {
        for (let i = 0; i < component.children.length; i++) {
            let result = getComponentWithIdRecursive(component.children[i], id);
            if (result) {
                return result;
            }
        }
    }
    return null;
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
