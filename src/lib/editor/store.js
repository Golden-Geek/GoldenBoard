import { writable } from 'svelte/store';
import Container from './components/containers/Container.svelte';
import Slider from './components/parameters/Slider.svelte';
import Button from './components/parameters/Button.svelte';

export const Layouts = Object.freeze({
    FREE: 'free',
    HORIZONTAL: "horizontal",
    VERTICAL: "vertical",
    GRID: "grid"
});

export const editMode = writable(false);
export const layout = writable(
    {
        main:
        {
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
                                        options: {
                                            label: "Button 1.1",
                                            style:
                                            {
                                                x: '10px',
                                                y: '10px',
                                                width: '80px',
                                                height: '50px'
                                            }
                                        }

                                    },
                                    {
                                        type: Slider,
                                        options: {
                                            label: "Slider 1.1",
                                            style:
                                            {
                                                x: '150px',
                                                y: '40px',
                                                width: '100px',
                                                height: '20px'
                                            }
                                        }
                                    }
                                ]
                            },
                            {
                                type: Button,
                                options: {
                                    label: "Button 1",
                                    style:
                                    {
                                        
                                    }
                                }
                            },
                            {
                                type: Slider,
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
                                options: {
                                    label: "Button 2"
                                }
                            },
                            {
                                type: Button,
                                options: {
                                    label: "Button 3"
                                }
                            },
                            {
                                type: Slider,
                                options: {
                                    label: "Slider 2"
                                }
                            }
                        ]
                    }
                ]
        }
    });