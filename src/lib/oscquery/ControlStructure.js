import { OSCQueryClient } from './OSCQueryClient';
import { ParametersManager } from './Parameter';
import { isDefined } from './utils';

// data structure storing the control paths
export class ControlStructure {
  constructor() {
    this.addressCallbackMap = new Map();

    this.structureObject = {};
    this.parametersManager = new ParametersManager();

    let _this = this;
    this.resolveControlStructureLoadedPromise = () => {};

    this.logCallback = undefined;

    this.controlStructureLoadedPromise = new Promise((resolve, reject) => {
      _this.resolveControlStructureLoadedPromise = resolve;

      setTimeout(reject, 5000);
    })
      .then(() => {
        // console.log('here');
      })
      .catch((e) => {
        // console.log('here in catch', e);
      });

    this.oscQueryClient = new OSCQueryClient(
      (newStructure, path, msg) => {
        // control structure update callback

        this.updateControlStructure(newStructure, path);

        // notify for initialisation sync
        // this.httpOSCQueryReceived = true;
        // oscQueryDataReady();
      },
      (packet) => {
        // 'streamed' updates (single parameter) callback
        let cNode = this.getControlNode(packet.address);
        if (cNode != null) cNode.VALUE = packet.args;
        else if (!packet.address.endsWith('/streamData'))
          console.warn('Got an update for a non existing node: ' + packet.address);

        this.parametersManager.processUpdateMessage(packet);
      },
      (type, source, message) => {
        if (this.logCallback) this.logCallback(message, source, type);
      }
    );
  }

  getControlStructure() {
    return this.structureObject;
  }

  updateControlStructure(obj, path = '/') {
    if (!obj) {
      console.error('Got a null / undefined object, ignoring update request !');
      return;
    }

    const nodeToUpdate = this.getControlNode(path, this.structureObject);
    if (!nodeToUpdate) {
      console.warn(path, 'not found in control structure');
      return;
    }

    Object.assign(nodeToUpdate, obj);

    this.resolveControlStructureLoadedPromise();

    if (path === '/') {
      //call all callbacks
      this.addressCallbackMap.forEach((value, key) => {
        const cNode = this.getControlNode(key, this.structureObject);
        if (isDefined(cNode)) {
          value.forEach((cb) => {
            cb.callback(cNode);
          });
        }
      });
    } else {
      if (this.addressCallbackMap.has(path)) {
        this.addressCallbackMap.get(path).forEach((cb) => {
          cb.callback(nodeToUpdate);
        });
      }
    }

    //bubble up
    let parentPath = this.getParentPath(path);
    let cNode;
    while (parentPath !== '') {
      if (this.addressCallbackMap.has(parentPath)) {
        this.addressCallbackMap.get(parentPath).forEach((cb) => {
          if (cb.listenToChildren) {
            cNode = this.getControlNode(path, this.structureObject);
            if (isDefined(cNode)) {
              cb.callback(nodeToUpdate);
            }
          }
        });
      }
      parentPath = this.getParentPath(parentPath);
    }
  }

  getArgsArray(val, type) {
    let valArray = Array.isArray(val) ? val : [val];
    let argsArray;
    switch (type) {
      case 'f':
      case 'i':
      case 's':
        argsArray = [{ type: type, value: valArray[0] }];
        break;

      case 'ff':
      case 'ii':
      case 'fff':
        argsArray = val.map((v) => {
          return { type: type[0], value: v };
        });
        break;

      case 'T':
      case 'F':
        argsArray = [{ type: valArray[0] ? 'T' : 'F', value: valArray[0] }];
        break;
      default:
        console.warn('Unhandled data type in ControlStructure.updateValue:', type);
    }

    return argsArray;
  }

  updateValue(cNode, val) {
    let argsArray = this.getArgsArray(val, cNode.TYPE);
    let valArray = Array.isArray(val) ? val : [val];

    this.oscQueryClient.sendValueUpdate(cNode.FULL_PATH, argsArray);

    cNode.VALUE = valArray;
  }

  updateAttribute(cNode, attrName, val, type) {
    for (let [key, _value] of Object.entries(cNode.ATTRIBUTES)) {
      if (key == attrName) {
        _value = val;
        let argsArray = this.getArgsArray(_value, type);
        this.oscQueryClient.sendValueUpdate(cNode.FULL_PATH + '/attributes/' + attrName, argsArray);
        return;
      }
    }
    console.error('Could not find attribute');
  }

  //EVENTS
  /**
   *
   * @param {String} address - control structure address to subscribe to
   * @param {Boolean} listenToChildren - flag that indicates if children updates should trigger a callback
   * @param {() => void } callback
   *
   * Will register a callback for control structure change for the specified address. The callback can also
   * be called on changes in children of the specified control structure node if the *listenToChildren* flag
   * is set.
   *
   * The *callback* function passed as an argument will be called before returning from this function with the
   * current value associated with the *address*. This was done to be consistent with the way Svelte stores
   * behave.
   */
  subscribeToStructureUpdates(address, listenToChildren, callback) {
    console.assert(callback);

    const cb = { listenToChildren: listenToChildren, callback: callback };
    if (this.addressCallbackMap.has(address)) {
      if (!this.addressCallbackMap.get(address).some((e) => e.callback == callback)) {
        this.addressCallbackMap.get(address).push(cb);
      }
    } else {
      this.addressCallbackMap.set(address, [cb]);
    }
    const cNode = this.getControlNode(address);
    if (cNode !== undefined) {
      callback(cNode);
    }

    // console.log("subscribeFromStructureUpdates", this.addressCallbackMap.get(address).length);
  }

  unsubscribeFromStructureUpdates(address, callback) {
    if (!this.addressCallbackMap.has(address)) return;
    let callbacksArray = this.addressCallbackMap.get(address);
    let index = callbacksArray.findIndex((e) => e.callback == callback);
    if (index > -1) {
      callbacksArray.splice(index, 1);
    } else {
      console.warn('Trying to unsubscribe from a non existing callback', address, callback);
    }

    // console.log("unsubscribeFromStructureUpdates", callbacksArray.length);

    if (callbacksArray.length == 0) {
      this.addressCallbackMap.delete(address);
    }
  }

  // HELPERS

  fetchNode(obj, currentPath, fullPath) {
    if (obj === undefined || !Object.prototype.hasOwnProperty.call(obj, 'FULL_PATH'))
      return undefined;
    if (obj.FULL_PATH == fullPath) {
      return obj;
    }

    let nextSlashIndex = currentPath.indexOf('/');
    let nextNodeKey = nextSlashIndex != -1 ? currentPath.slice(0, nextSlashIndex) : currentPath;
    let nextNodeParent = obj.CONTENTS;
    if (!nextNodeParent) return undefined;
    return this.fetchNode(
      nextNodeParent[nextNodeKey],
      currentPath.slice(nextSlashIndex + 1),
      fullPath
    );
  }

  getControlNode(path) {
    if (path == '/') return this.structureObject;
    return this.fetchNode(this.structureObject, path.slice(1), path);
  }

  getAttribute(path) {
    let attributesToken = '/attributes/';
    if (path.indexOf(attributesToken) < 0) return null;
    let _parentNode = this.getControlNode(path.substring(0, path.indexOf(attributesToken)));
    console.assert(_parentNode);
    let attributes = _parentNode.ATTRIBUTES;
    if (!attributes) return undefined;
    console.assert(attributes);
    let attributeKey = path.substring(path.indexOf(attributesToken) + attributesToken.length);
    for (const [key, _value] of Object.entries(attributes)) {
      if (key == attributeKey) {
        return {
          parentNode: _parentNode,
          attrName: attributeKey,
          value: _value
        };
      }
    }
    console.assert(false);
  }

  getControlNodePromise(path) {
    let _this = this;
    return this.controlStructureLoadedPromise.then(() => {
      return _this.getControlNode(path);
    });
  }

  addItem(path, type) {
    // console.log('add item', path, type);
    this.oscQueryClient.sendOSCQueryWebsocketCommand({
      COMMAND: 'ADD',
      DATA: { address: path, type: type }
    });
  }

  addItemWithExtendedType(path, extendedType) {
    this.oscQueryClient.sendOSCQueryWebsocketCommand({
      COMMAND: 'ADD',
      DATA: { address: path, extendedType: extendedType }
    });
  }

  removeItem(path) {
    this.oscQueryClient.sendOSCQueryWebsocketCommand({
      COMMAND: 'REMOVE',
      DATA: { address: path }
    });
  }

  getParentPath(path) {
    if (path == '/') return '';
    let pathArray = path.split('/');
    pathArray.pop();
    let parentPath = pathArray.length == 1 ? '/' : pathArray.join('/');
    return parentPath;
  }

  getPathRelativeTo(fullPath, referencePath) {
    let startIndex = fullPath.indexOf(referencePath);
    switch (startIndex) {
      case -1:
        console.error(referencePath + ' not found in ' + fullPath);
        return '';
      case 0:
        break;
      default:
        console.warn(
          referencePath + ' does not start at the root, returning the subpath relative to it'
        );
    }
    let relativePath = fullPath.substring(startIndex + referencePath.length, fullPath.length);
    if (relativePath.at(0) != '/') return String('/').concat(relativePath);
    else return relativePath;
  }

  getChildrenArray(
    controlNode,
    filterFunction = (node) => {
      return true;
    }
  ) {
    if (controlNode == undefined) {
      console.warn('Control node is undefined');
      return [];
    }

    let values = Object.values(controlNode.CONTENTS);
    values = values.filter(filterFunction);
    return values;
  }

  getChildrenItems(controlNode, typeFilters = []) {
    return this.getChildrenArray(controlNode, (node) => {
      return node.CONTENTS != null && (typeFilters.length == 0 || typeFilters.includes(node.TYPE));
    });
  }

  findItemsWithType(type, recursive = true, controlNode = this.structureObject) {
    let result = [];
    let filterChildren = this.getChildrenItems(controlNode, [type]);
    result = result.concat(filterChildren);
    if (recursive) {
      let allChildren = this.getChildrenItems(controlNode);
      allChildren.forEach((child) => {
        result = result.concat(this.findItemsWithType(type, recursive, child));
      });
    }
    return result;
  }

  getValueFromData(controlStructureNode) {
    switch (controlStructureNode.TYPE) {
      case 'I':
      case 'N':
        //trigger
        break;

      case 'r':
        return controlStructureNode.VALUE[0];
      case 'fff':
        return [
          controlStructureNode.VALUE[0],
          controlStructureNode.VALUE[1],
          controlStructureNode.VALUE[2]
        ];
      case 'ff':
        return [controlStructureNode.VALUE[0], controlStructureNode.VALUE[1]];
      case 'f':
      case 'i':
        return Number(controlStructureNode.VALUE[0]);
      case 'T':
      case 'F':
        return Boolean(controlStructureNode.VALUE[0]); // we should always check the value, in some cases a type T has an underlying false value
        break;
      case 's':
        return '' + controlStructureNode.VALUE[0];
      default:
        console.error('Unhandled type conversion');
    }
    return undefined;
  }
}
