import { mainData, saveData } from "$lib/engine.svelte";
import type { Server } from "http";
import { OSCQueryClient } from "./oscquery.svelte";

export const ssr = false;
export const prerender = false;

export type ServerConfig = {
    ip: string;
    port: number;
    name: string;
};

let serverConfigs = $derived(mainData.serverData.serverConfigs);
export const servers: OSCQueryClient[] = $state([]);

export const defaultServerConfig: ServerConfig = { ip: '127.0.0.1', port: 42000, name: "Default" };

export const addServer = function (): OSCQueryClient {
    const client = new OSCQueryClient();
    servers.push(client);
    saveData();
    return client;
}

export const removeServer = function (server: OSCQueryClient) {
    let index = servers.indexOf(server);
    if (index > -1) {
        server.disconnect();
        server.cleanup();
        servers.splice(index, 1);
    }

    saveData();
}

export const clearServers = function () {
    while (servers.length > 0) {
        let server = servers.pop();
        server?.disconnect();
        server?.cleanup();
    }
}

export function getServerConfigs(): ServerConfig[] {
    const configs: ServerConfig[] = [];
    for (let client of servers) {
        configs.push({
            ip: client.ip,
            port: client.port,
            name: client.name
        });
    }

    return configs;
}

export function loadServerConfigs() {
    clearServers();

    if (serverConfigs.length === 0) {
        serverConfigs.push(defaultServerConfig);
    }

    for (let config of serverConfigs) {
        const client = new OSCQueryClient(config);
        servers.push(client);
    }
}


//Node type icons

const nodeTypes = [
    { type: "Container", icon: "📁" },
    { type: "Boolean", icon: "☑️" },
    { type: "Integer", icon: "🔢" },
    { type: "Float", icon: "🔣" },
    { type: "String", icon: "🔤" },
    { type: "Color", icon: "🎨" },
    { type: "Trigger", icon: "⚡" },
    { type: "Enum", icon: "🎛️" },
    { type: "Point2D", icon: "📐" },
    { type: "Point3D", icon: "🧊" },
]

export function getNodeIcon(type: string): string {
    const nodeType = nodeTypes.find(t => t.type === type);
    return nodeType ? nodeType.icon : "❓";
}
