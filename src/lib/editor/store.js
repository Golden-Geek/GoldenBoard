import { get, writable } from 'svelte/store';
import Container from './components/containers/Container.svelte';
import Slider from './components/parameters/Slider.svelte';
import Button from './components/parameters/Button.svelte';

export const selectedComponents = writable([]);
export const editMode = writable(false);
export const outlinerOpen = writable(true);

export const Layouts = Object.freeze({
    FREE: 'free',
    HORIZONTAL: "horizontal",
    VERTICAL: "vertical",
    GRID: "grid"
});


export const layout = writable(
    {
        main:
        {
            id: "main",
            type: Container,
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
                        type: Container,
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
                                type: Container,
                                id: "container1.1",
                                options: {
                                    label: "Container 1.1",
                                    layout: Layouts.FREE,
                                    style:
                                    {
                                        size: '200px',
                                        shrink: '0'
                                    }
                                },
                                children: [
                                    {
                                        type: Button,
                                        id: "button1.1",
                                        options: {
                                            label: "Button 1.1",
                                            style:
                                            {
                                                x: '10%',
                                                y: '10px',
                                                width: '80%',
                                                height: '50px'
                                            }
                                        }

                                    },
                                    {
                                        type: Slider,
                                        id: "slider1.1",
                                        options: {
                                            label: "Slider 1.1",
                                            style:
                                            {
                                                x: '150px',
                                                y: '80px',
                                                width: '100px',
                                                height: '20px'
                                            }
                                        }
                                    }
                                ]
                            },
                            {
                                type: Button,
                                id: "button1",
                                options: {
                                    label: "Button 1",
                                    style:
                                    {

                                    }
                                }
                            },
                            {
                                type: Slider,
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
                        type: Container,
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
                                type: Button,
                                id: "button2",
                                options: {
                                    label: "Button 2"
                                }
                            },
                            {
                                type: Button,
                                id: "button3",
                                options: {
                                    label: "Button 3"
                                }
                            },
                            {
                                type: Slider,
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
    console.log("Checking component: " + component.id + " for id: " + id);
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
