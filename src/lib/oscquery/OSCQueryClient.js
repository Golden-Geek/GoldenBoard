import * as osc from 'osc';
import { hostInfoStore, websocketConnectionStatusStore } from './store';
import { get } from 'svelte/store';

// TODO: add an observer pattern to handle the callbacks ?
// TODO: handle the PATH_*

/**
 * OSCQueryClient handles the communication with the backend
 *
 * The constructor has 2 parameters:
 *
 * 1. controlStructureCallback -> (controlStructureObject, path = "/", msg) => {}
 *
 * This callback will be called when there is a control structure change (initialisation, addition, deletion, name change) in the structure.
 * The function called should have 3 parameters: the controlStructureObject of the update (it can be a part of the full control structure),
 * , the path where this object belongs and the message that triggered the update if the update came from the server.
 *
 * 2. valueUpdateCallback -> (oscPacket) => {}
 *
 * This callback will be called when we receive a value update from the backend. This happens when there was a LISTEN message sent to the backend, to request an update a some point
 *
 *
 */
export class OSCQueryClient {
  constructor(
    controlStructureUpdateCallback = undefined,
    valueUpdateCallback = undefined,
    logCallback = undefined
  ) {
    // connection infos
    this.oscPort = undefined;
    this.isOSCReady = false;
    this.serverURL = '';

    // callbacks
    this.controlStructureUpdateCallback = controlStructureUpdateCallback;
    this.valueUpdateCallback = valueUpdateCallback;
    this.logCallback = logCallback;
    this.pendingMessages = [];
  }

  queryStructure() {
    this.retrieveHostInfo(this.serverURL, (err, hostInfos) => {
      if (hostInfos) hostInfoStore.set(hostInfos);
    });
    this.retrieveJson(this.serverURL, (err, result) => {
      if (err) {
        console.error('Could not get control structure from URL');
        console.error(err);
        return;
      }

      if (!this.controlStructureUpdateCallback) {
        console.error('OSCQueryClient: No refresh callback');
        return;
      }
      this.controlStructureUpdateCallback(result, '/');
    });
  }

  async connect(url, callback = undefined) {
    this.serverURL = url;
    await this.queryStructure();
    await this.initWebSocket(this.serverURL.replace('http', 'ws'), callback);
  }

  updateConnectionStatus(connectionEvent) {
    let val = 3;
    if (connectionEvent.type == 'connecting') {
      val = 0;
    } else if (connectionEvent.type == 'open') {
      val = 1;
    } else if (connectionEvent.type == 'closing') {
      val = 2;
    } else if (connectionEvent.type == 'closed') {
      val = 3;
    } else {
      console.error('unknown connection status type: ' + connectionEvent.type);
    }

    websocketConnectionStatusStore.set(val);
  }

  initWebSocket(url, callback) {
    console.log('init websocket');
    this.oscPort = new osc.WebSocketPort({
      url: url,
      metadata: true
    });

    this.oscPort.open();

    // callback to have the status of the connection
    this.oscPort.socket.addEventListener('connecting', (event) => {
      this.updateConnectionStatus(event);
    });

    this.oscPort.socket.addEventListener('open', (event) => {
      this.pendingMessages.forEach((m) => {
        this.oscPort.socket.send(m);
      });
      this.updateConnectionStatus(event);
    });

    this.oscPort.socket.addEventListener('closing', (event) => {
      this.updateConnectionStatus(event);
    });

    this.oscPort.socket.addEventListener('close', (event) => {
      this.updateConnectionStatus(event);
      setTimeout(() => {
        this.initWebSocket(url, callback);
      });
    });

    this.oscPort.on('ready', () => {
      this.isOSCReady = true;
      if (callback) callback();
      this.oscPort.socket.onmessage = (e) => {
        // Check if message was a JSON command.
        let msg = null;
        try {
          msg = JSON.parse(e.data);
        } catch (e) {
          // pass
        }
        if (msg) {
          if (!this.processCommandMessage(msg)) {
            console.log('Unexpected non-command message: ' + e.data);
          }
          return;
        }
        // Non-JSON data, assume it's a binary OSC packet.
        let packet = osc.readPacket(new Uint8Array(e.data), {});
        //console.log('***** Got packet <' + JSON.stringify(packet) + '>');
        let address = packet.address;
        // console.log("We have an update to dispatchf for: " + address);
        // if(!this.valueUpdateCallback)
        // {
        //     console.error("OSCQueryClient: no update callback");
        //     return;
        // }
        this.valueUpdateCallback(packet);
        // TODO: Validate address contains allowed characters.

        // code from htmlosc
        // let query = '[data-full-path="' + address + '"]';
        // let detailsElem = document.querySelector(query);
        // let groupElem = detailsElem.parentNode.parentNode;
        // for (let i = 0; i < packet.args.length; i++) {
        //     let value = packet.args[i];
        //     let controlElem = groupElem.children[i];
        //     applyOSCMessageValue(controlElem, value);
        // }
      };
    });
  }

  retrieveHostInfo(url, cb) {
    var hostInfoUrl = url + '/?HOST_INFO';
    fetch(hostInfoUrl)
      .then(function (response) {
        return response.json();
      })
      .then(function (json) {
        cb(null, json);
      })
      .catch(function (err) {
        cb('No HOST_INFO "' + err + '"', null);
      });
  }

  retrieveJson(url, cb) {
    fetch(url)
      .then(function (response) {
        return response.json();
      })
      .then(function (json) {
        cb(null, json);
      });
    // .catch(function (err) {
    //     cb('Failed to process JSON: ' + err, null);
    // });
  }

  reloadParentNode(msg) {
    let nodePath = msg.DATA;
    if (nodePath.NEW) nodePath = nodePath.NEW;
    let nodeUrl = this.serverURL + nodePath;

    let pathParts = nodePath.split('/');
    let numParts = pathParts.length - 1;
    let nodeName = pathParts[numParts];

    // send an update on the parent
    let parentParts = pathParts.slice(1, numParts);
    let parentPath = '';
    parentParts.forEach((element) => {
      parentPath += '/';
      parentPath += element;
    });
    let parentURL = this.serverURL + parentPath;

    // if we got a scene / world / whatever reload full CS

    // otherwise we will do a partial

    this.retrieveJson(parentURL, (err, contents) => {
      this.controlStructureUpdateCallback(contents, parentPath, msg);
      //this.valueUpdateCallback({address:parentPath}); // is this really usefull here ?
    });
  }

  /**
   *
   * @param {*} msg
   * @returns was succesfully processed
   */
  processCommandMessage(msg) {
    if (msg.COMMAND == 'PATH_CHANGED') {
      //            if (this.hostInfos?.extensions.PATH_CHANGED) {
      // console.error("Got a PATH_CHANGED command, not handled for now");
      //            }
      this.reloadParentNode(msg);
    } else if (msg.COMMAND == 'PATH_ADDED') {
      //            if (this.hostInfos?.extensions.PATH_ADDED) {
      // console.log("Got a PATH_ADDED command");
      this.reloadParentNode(msg);
      //this.queryStructure();
      //            }
    } else if (msg.COMMAND == 'PATH_RENAMED') {
      //            if (this.hostInfos?.extensions.PATH_RENAMED) {
      // let oldPath = msg.DATA.OLD;
      // let newPath = msg.DATA.NEW;
      this.reloadParentNode(msg);

      // console.error("We got a PATH_RENAMED command, not handled for now");
      //            }
    } else if (msg.COMMAND == 'PATH_REMOVED') {
      //            if (this.hostInfos?.extensions.PATH_REMOVED) {
      // console.log("We got a PATH_REMOVED command");
      this.reloadParentNode(msg);
      //this.queryStructure();
      //            }
    } else if (msg.COMMAND == 'SAVE') {
      let info = get(hostInfoStore);
      let filename = info.NAME.replace('Pleiades - ', '');
      this.downloadObjectAsJson(msg.DATA['data'], filename.replace('.star', ''));
    } else if (msg.COMMAND == 'LOG') {
      this.logCallback(msg.DATA.type, msg.DATA.source, msg.DATA.message);
    } else {
      return false;
    }

    return true;
  }

  sendValueUpdate(address, newValuesArray) {
    this.sendOSCPacket(address, newValuesArray);
  }

  // Communications methods towards the backend

  sendOSCPacket(address, args) {
    this.oscPort.send({
      address: address,
      args: args
    });
  }

  /**
   *
   * @param {String} msg - message to send over the websocket
   *
   * If the websocket connection is not open, this function will push the message passed as an argument
   * in a buffer array, which will get sent once the websocket connection is established.
   */
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

  loadDataToPath(path, data) {
    this.sendOSCQueryWebsocketCommand({
      COMMAND: 'LOAD',
      DATA: { address: path, data: data }
    });
  }

  sendUndoableCommand(path, beforeVal, currentVal) {
    if (beforeVal == undefined || currentVal == undefined) {
      console.warn('Cannot send undo state with undefined value');
      return;
    }
    let o = {};
    let pname = 'undoable:' + path;
    o[pname] = [beforeVal, currentVal];
    this.sendWebsocketMessage(JSON.stringify(o));
  }

  sendMultiUndoableCommand(name, data) {
    let o = {};
    let pname = 'undoables:' + name;
    o[pname] = data;
    this.sendWebsocketMessage(JSON.stringify(o));
  }

  saveDataFromPath(path) {
    // make sure to get the latest hostInfos first
    this.retrieveHostInfo(this.serverURL, (err, hostInfos) => {
      if (hostInfos) hostInfoStore.set(hostInfos);
      this.sendOSCQueryWebsocketCommand({
        COMMAND: 'SAVE',
        DATA: { address: path }
      });
    });
  }

  downloadObjectAsJson(exportObj, exportName) {
    var dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(exportObj));
    var downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute('href', dataStr);
    downloadAnchorNode.setAttribute('download', exportName + '.star');
    document.body.appendChild(downloadAnchorNode); // required for firefox
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
  }
}
