import { Parameter } from './Parameter.svelte.js';

export let servers = $state([]);

export const addServer = function () {
    let client = new OSCQueryClient("New Server");
    servers.push(client);
    return client;
}

export const removeServer = function (client) {
    let index = servers.indexOf(client);
    if (index > -1) {
        servers.splice(index, 1);
    }
}

import * as osc from 'osc';

export class OSCQueryClient {

    connected = $state(false);
    ip = $state('127.0.0.1');
    port = $state(42000);
    name = $state("[OSCQueryClient]");

    data = $state({});

    addressMap = {};

    constructor(name) {
        this.name = name;
        this.setup();
    }

    connect() {
        if (this.connected) return;

        console.log(`[${this.name}] Connecting to: ${this.ip} : ${this.port}...`);
        try {
            this.oscPort.open();
        } catch (e) {
            console.error("Error connecting to: " + this.ip + ":" + this.port);
        }

        this.oscPort.socket.addEventListener('connecting', (e) => this.connectionStatusChanged(e));
        this.oscPort.socket.addEventListener('open', (e) => this.connectionStatusChanged(e));
        this.oscPort.socket.addEventListener('closing', (e) => this.connectionStatusChanged(e));
        this.oscPort.socket.addEventListener('close', (e) => this.connectionStatusChanged(e));
        this.oscPort.socket.onerror = (e) => { console.warn("Connection error"); };
        this.oscPort.socket.onmessage = (e) => this.wsMessageReceived(e);

        this.oscPort.on('ready', () => { this.oscPort.socket.onmessage = (e) => this.wsMessageReceived(e); });

    }

    setup() {
        // console.log(`[${this.name}] Init OSCQuery Websocket Client`);

        if (this.oscPort) {
            this.oscPort.close();
            delete this.oscPort;
        }

        this.oscPort = new osc.WebSocketPort({
            url: "http://" + this.ip + ":" + this.port,
            metadata: true
        });

        this.connect();
    }

    setIPAndPort(ip, port) {
        this.ip = ip;
        this.port = port;
        this.setup();
    }

    setConnected(value) {
        this.connected = value;
        if (!this.connected) {
            console.log(this, `[${this.name}] Connection lost. Reconnecting...`);
            setTimeout(() => this.connect(), 1000);
        } else {
            console.log(`[${this.name}] Connected !`);
            this.requestStructure();
        }
    }


    connectionStatusChanged(e) {
        switch (e.type) {
            case 'open':
                this.setConnected(true);

                break;
            case 'close':
                this.setConnected(false);
                break;
        }
    }

    requestStructure() {
        fetch("http://" + this.ip + ":" + this.port + '/')
            .then((response) => {
                return response.json();
            })
            .then((json) => {
                this.parseStructure(json);
                this.requestHostInfo();
            });
    }

    requestHostInfo() {
        var hostInfoUrl = "http://" + this.ip + ":" + this.port + '/?HOST_INFO';
        console.log("Requesting Host Info: ", hostInfoUrl);
        fetch(hostInfoUrl)
            .then(function (response) {
                return response.json();
            })
            .then((json) => {
                this.parseHostInfo(json);
            })
            .catch((err) => {
                console.warn("Error fetching host info: ", err);
            });
    }

    sendWebsocketMessage(msg) {
        if (this.oscPort.socket.readyState != 1) {
            this.pendingMessages.push(msg);
        } else this.oscPort.socket.send(msg);
    }

    sendOSCQueryWebsocketCommand(msg) {
        let textMsg = msg;
        if (typeof msg !== 'string') textMsg = JSON.stringify(msg);
        this.sendWebsocketMessage(textMsg);
    }

    wsMessageReceived(e) {
        // console.log("Message received: ", e.data);
        let msg = null;
        try {
            msg = JSON.parse(e.data);
            if (msg) {
                if (!this.processCommandMessage(msg)) {
                    console.log('Unexpected non-command message: ' + e.data);
                }
                return;
            }
        } catch (e) {
            // not JSON
        }

        this.processOSCMessage(e.data);
    }

    parseStructure(json) {
        this.data = json;
        this.buildAddressMap();
    }

    parseHostInfo(json) {
        this.hostInfo = json;
        // console.log("Host Info: ", json);
    }

    buildAddressMap(node) {
        if (!node) {
            node = this.data;
        }

        if (node.FULL_PATH) {
            this.addressMap[node.FULL_PATH] = { node: node, listeners: [] };
        }
        if (node.CONTENTS) {
            for (let i in node.CONTENTS) this.buildAddressMap(node.CONTENTS[i]);
        }
    }

    processCommandMessage(msg) {
        return false;
    }

    processOSCMessage(msg) {
        // console.log("OSC Message received: ", msg);
        let packet = osc.readPacket(new Uint8Array(msg), {});
        let address = packet.address;

        let nMap = this.addressMap[address];
        if (!nMap) {
            console.warn("Got update from OSCQuery but address not found: " + address);
            return;
        }
        nMap.node.VALUE = packet.args;
        nMap.listeners.forEach((listener) => listener({ event: "valueChanged", value:nMap.node.VALUE }));
    }



    //Listeners
    addNodeListener(address, callback) {
        if (!this.addressMap[address]) {
            console.warn("Address not found : " + address);
            return
        }
        if (this.addressMap[address].listeners.length == 0) {
            console.log("First listener, sending LISTEN for " + address);
            this.sendOSCQueryWebsocketCommand({
                COMMAND: 'LISTEN',
                DATA: address
            });
        }
        this.addressMap[address].listeners.push(callback);
    }

    removeNodeListener(address, callback) {
        if (!this.addressMap[address]) {
            console.warn("Address not found : " + address);
            return
        }
        let index = this.addressMap[address].listeners.indexOf(callback);

        if (index > -1) {
            this.addressMap[address].listeners.splice(index, 1);
        } else {
            console.warn("Listener not found for " + address);
        }

        if (this.addressMap[address].length == 0) {
            console.log("No more listeners, sending IGNORE for " + address);
            this.sendOSCQueryWebsocketCommand({
                COMMAND: 'IGNORE',
                DATA: address
            });
        }
    }


    //Structure methods
    getRoot() {
        return this.data;
    }

    getNode(address) {
        let nMap = this.addressMap[address];
        if (!nMap) {
            console.warn("Node not found: " + address);
            return null;
        }
        return nMap.node;
    }

    getChildNode(node, relativeAddress) {
        return this.getNode(addrnode.FULL_PATH + "/" + relativeAddress);
    }

    createParameter(address, callback) {
        let node = this.getNode(address);
        if (!node) {
            console.warn("Address not found for paramter : " + address, this.addressMap);
            return null;
        }
        return new Parameter(this, node, callback);
    }

    //Helpers
    hasData() {
        return Object.entries(this.data).length > 0;
    }
}