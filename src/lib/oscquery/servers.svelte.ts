import { OSCQueryClient } from "./oscquery.svelte";

export const ssr = false;
export const prerender = false;

export let servers: OSCQueryClient[] = $state([]);

export const loadServerConfigs = function (configs?: any[]) {
    clearServers();
    if(!configs || configs.length === 0)
    {
        configs = [ { ip: '127.0.0.1', port: 42000, name: "Default"}];
    }

    for (let config of configs) {
        const client = new OSCQueryClient(config);
        servers.push(client);
    }
}

export const addServer = function (): OSCQueryClient {
    const client = new OSCQueryClient();
    servers.push(client);
    return client;
}

export const removeServer = function (client: OSCQueryClient) {
    let index = servers.indexOf(client);
    if (index > -1) {
        servers.splice(index, 1);
    }
}

export const clearServers = function () {
    while(servers.length > 0) {
        let server = servers.pop();
        server?.disconnect();
    }
}
