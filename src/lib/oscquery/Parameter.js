import controlStructure from './oscquery';

export class ParametersManager {
  constructor() {
    this.addressParameterMap = new Map();
  }
  // init etc...

  /**
   *
   * @param {string} address - the OSC address we will subscribe to
   * @param {Parameter} parameter - the parameter that will be used to dispatch callbacks
   *
   * We expect the backend to send an update message when it receive the LISTEN command, to make sure
   * that the control structure (and the parameter) has the correct value to start from.
   * If it is not the case, the parameter might display a non-updated value.
   */
  subscribeToUpdates(address, parameter) {
    if (this.addressParameterMap.has(address)) {
      if (!this.addressParameterMap.get(address).includes(parameter))
        this.addressParameterMap.get(address).push(parameter);
    } else {
      this.addressParameterMap.set(address, [parameter]);
      controlStructure.oscQueryClient.sendOSCQueryWebsocketCommand({
        COMMAND: 'LISTEN',
        DATA: address
      });
    }
  }

  unsubscribeFromUpdates(address, parameter) {
    if (!this.addressParameterMap.has(address)) return;
    let parametersArray = this.addressParameterMap.get(address);
    let index = parametersArray.indexOf(parameter);
    if (index > -1) {
      parametersArray.splice(index, 1);
    }
    if (parametersArray.length == 0) {
      this.addressParameterMap.delete(address);
      controlStructure.oscQueryClient.sendOSCQueryWebsocketCommand({
        COMMAND: 'IGNORE',
        DATA: address
      });
    }
  }

  processUpdateMessage(msg) {
    // handle the parameter update (those cannot bubble up, so we simply notify the parameter in the map)
    if (this.addressParameterMap.has(msg.address)) {
      this.addressParameterMap.get(msg.address).forEach((parameter) => {
        parameter.updateValue(msg.args);
      });
    }
  }

  sendValueUpdateFromParameter(parameter, value) {
    controlStructure.updateValue(parameter.controlNode, value);

    if (this.addressParameterMap.has(parameter.address)) {
      this.addressParameterMap.get(parameter.address).forEach((parameter) => {
        parameter.updateValue(value);
      });
    }
  }
}

export class Parameter {
  constructor(address, callbackFunction = () => {}) {
    this.address = address;
    this.callbackFunction = callbackFunction;
    this.value = undefined;
    this.controlNode = controlStructure.getControlNode(address);

    this.value = this.controlNode != null ? this.controlNode.VALUE : undefined;

    controlStructure.parametersManager.subscribeToUpdates(address, this);
  }

  // update coming from backend
  updateValue(value) {
    if (value.length > 0) {
      if (
        Array.isArray(value) &&
        Array.isArray(this.value) &&
        value.length == this.value.length &&
        value.every((v, i) => v == this.value[i])
      )
        return;
      if (value == this.value) return;
    }

    this.value = value;
    this.callbackFunction(this, value);
  }

  unregister() {
    // console.log("unregister parameter "+this.address);
    controlStructure.parametersManager.unsubscribeFromUpdates(this.address, this);
  }

  // update from frontend to backend
  sendValue(value) {
    this.value = value;
    let val = Array.isArray(value) ? value : [value];
    controlStructure.parametersManager.sendValueUpdateFromParameter(this, val);
  }

  sendUndoableValue(startValue, endValue) {
    controlStructure.oscQueryClient.sendUndoableCommand(this.address, startValue, endValue);
    // this.value = endValue;
    // controlStructure.parametersManager.sendValueUpdateFromParameter(this, val);
  }
}

export class AttributeParameter {
  constructor(address, callbackFunction = () => {}) {
    this.address = address;
    this.callbackFunction = callbackFunction;
    this.value = undefined;
    let attributeStruct = controlStructure.getAttribute(address);

    if (attributeStruct) {
      this.controlNode = attributeStruct.parentNode;
      this.attrName = attributeStruct.attrName;
      this.value = attributeStruct.value;
    }

    controlStructure.parametersManager.subscribeToUpdates(address, this);
  }

  // update coming from backend
  updateValue(value) {
    if (value.length > 0) {
      if (
        Array.isArray(value) &&
        Array.isArray(this.value) &&
        value.length == this.value.length &&
        value.every((v, i) => v == this.value[i])
      )
        return;
      if (value == this.value) return;
    }

    this.value = value;
    this.callbackFunction(this, value);
  }

  unregister() {
    controlStructure.parametersManager.unsubscribeFromUpdates(this.address, this);
  }

  sendValue(value) {
    this.value = value;
    controlStructure.updateAttribute(this.controlNode, this.attrName, [value ? 1 : 0], 'i');
  }
}
