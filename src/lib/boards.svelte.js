import { layoutTypes } from "./editor/editor.svelte";
import { v4 as uuidv4 } from "uuid";

export let boardData = $state({ boards: [] });
export let demoBoards =
    [
        {
            id: "board1",
            type: "container",
            options:
            {
                label: "Board 1",
                layout: layoutTypes.HORIZONTAL,
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
                            layout: layoutTypes.VERTICAL,
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
                                    layout: layoutTypes.FREE,
                                    style:
                                    {
                                        // size: '400px',
                                        // shrink: '0'
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
                                type: "container",
                                id: "emptyContainer",
                                children: []
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
                            layout: layoutTypes.GRID,
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
        ,
        {
            id: "board2",
            type: "container",
            options:
            {
                layout: "horizontal",
                label: "Board 2",
            },
            children:
                [

                    {
                        type: "button",
                        id: "button4",
                        options: {
                            label: "Button 4"
                        }
                    },
                    {
                        type: "button",
                        id: "button5",
                        options: {
                            label: "Button 5"
                        }
                    },
                    {
                        type: "slider",
                        id: "slider3",
                        options: {
                            label: "Slider 3"
                        }
                    }
                ]
        }
    ];

export const removeComponent = (parent, comp) => {
    if(parent == null)
    {
        boardData.boards.forEach(board => removeComponent(board, comp));
        return;
    }

    if(!parent.children) return;
    parent.children = parent.children.filter(child => comp !== child);
    parent.children.forEach(child => removeComponent(child, comp));
};

boardData.boards = demoBoards;