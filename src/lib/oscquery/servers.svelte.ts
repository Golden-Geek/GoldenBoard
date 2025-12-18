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

$effect.root(() => {
    $effect(() => {
        if (serverConfigs.length === 0) {
            serverConfigs.push(defaultServerConfig);
        }

        syncServerFromConfigs(serverConfigs);
    });

    return () => {
    }
});

export const servers: OSCQueryClient[] = $state([]);

export const defaultServerConfig: ServerConfig = { ip: '127.0.0.1', port: 42000, name: "Default" };

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

function syncServerFromConfigs(configs: ServerConfig[]) {


    // Remove servers that are no longer in configs
    for (let i = servers.length - 1; i >= 0; i--) {
        const server = servers[i];
        const match = configs.find(c => c.ip === server.ip && c.port === server.port && c.name === server.name);
        if (!match) {
            server.disconnect();
            server.cleanup();
            servers.splice(i, 1);
        }
    }


    // Add or update servers from configs
    for (let config of configs) {
        let server = servers.find(s => s.ip === config.ip && s.port === config.port);
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
