import { mainData, saveData } from "$lib/engine.svelte";
import type { Server } from "http";
import { OSCQueryClient } from "./oscquery.svelte";

export const ssr = false;
export const prerender = false;

export type ServerConfig = {
    id: string;
    ip: string;
    port: number;
    name: string;
};

let serverConfigs = $derived(mainData.serverData.serverConfigs);

export const servers: OSCQueryClient[] = $state([]);

export const defaultServerConfig: ServerConfig = { id: 'server-' + crypto.randomUUID(), ip: '127.0.0.1', port: 42000, name: "Default" };

export const addServer = function (): OSCQueryClient {
    const client = new OSCQueryClient();
    servers.push(client);
    saveData("Add Server");
    return client;
}

export const removeServer = function (server: OSCQueryClient) {
    let index = servers.indexOf(server);
    if (index > -1) {
        server.disconnect();
        server.cleanup();
        servers.splice(index, 1);
    }

    saveData("Remove Server");
}

export const clearServers = function () {
    while (servers.length > 0) {
        let server = servers.pop();
        server?.disconnect();
        server?.cleanup();
    }
}

export function syncServerFromConfigs() {

    if (serverConfigs.length === 0) {
        serverConfigs.push($state.snapshot(defaultServerConfig));
    }
    // Remove servers that are no longer in configs
    for (let i = servers.length - 1; i >= 0; i--) {
        const server = servers[i];
        const match = serverConfigs.find(c => c.id === server.id);
        if (!match) {
            console.log("Removing server:", server.name);
            server.disconnect();
            server.cleanup();
            servers.splice(i, 1);
        }
    }


    // Add or update servers from configs
    for (let config of serverConfigs) {
        let server = servers.find(s => s.id === config.id);
        if (!server) {
            server = new OSCQueryClient(config);
            servers.push(server);
        } else {
            server.name = config.name;
        }
    }
}

export function getServerConfigs(): ServerConfig[] {
    const configs: ServerConfig[] = [];
    for (let client of servers) {
        configs.push({
            id: client.id,
            ip: client.ip,
            port: client.port,
            name: client.name
        });
    }

    return configs;
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
