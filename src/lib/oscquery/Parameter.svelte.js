import { OSCQueryOSCTypes } from "./oscquery.svelte";

export class Parameter {
    client
    node;
    valueChangedCallback;
    isComplex;
    isTrigger;

    constructor(client, node, valueChangedCallback) {
        this.client = client;
        this.valueChangedCallback = valueChangedCallback;

        if (typeof (node) === "string") {
            this.node = this.client.getNode(address);
        } else {
            this.node = node;
        }

        this.isTrigger = this.node.TYPE == "N" || this.node.TYPE == "I";
        this.isComplex = !this.isTrigger && this.node.VALUE.length > 1;

        this.client.addNodeListener(this.node.FULL_PATH, (e) => this.nodeUpdated(e));
    }

    destroy() {
        this.client.removeNodeListener(this.node.FULL_PATH);
        this.node = null;
        this.client = null;
    }

    nodeUpdated(e) {
        // console.log("Node updated: ", e);
        switch (e.event) {
            case "valueChanged":
                this.valueChanged($state.snapshot(e.value));
                break;

            case "rangeChanged":
                this.rangeChanged(e.min, e.max);
                break;

            case "enumerationChanged":
                this.enumerationChanged(e.enumeration);
                break;

            case "nameChanged":
                this.nameChanged(e.name);
                break;

            case "addressChanged":
                this.addressChanged(e.address);
                break;
        }
    }

    //Events from client
    valueChanged(value) {
        // console.log("Value changed: ", value);
        if (this.valueChangedCallback) this.valueChangedCallback(this.getValue());
    }

    rangeChanged(min, max) {
        console.log("Range changed: ", min, max);
    }

    enumerationChanged(enumeration) {
        console.log("Enumeration changed: ", enumeration);
    }

    nameChanged(name) {
        console.log("Name changed: ", name);
    }

    addressChanged(address) {
        console.log("Address changed: ", address);
    }

    getValue() {
        return this.isComplex || this.isTrigger ? this.node.VALUE : this.node.VALUE[0];
    }

    //Handlers from editor
    setValue(value, forceSend) {
        if (!this.isTrigger) {
            if (!Array.isArray(value) && value != undefined) value = [value];
            if (!this.checkCoherentValue(value, this.node.VALUE)) return;
            if (!forceSend && this.checkSameValue(value, this.node.VALUE)) return;
        }

        this.client.setValueFromParameter(this, this.isTrigger ? [] : value);
    }

    setRange(min, max) {
        this.client.setRangeFromParameter(this, min, max);
    }

    //Checkers
    checkCoherentValue(value1, value2) {
        if (this.isTrigger) return true;
        if (value1.length != value2.length) {
            console.warn("Length mismatch", value1.length, value2.length);
            return false;
        }

        return true;
    }

    checkSameValue(value1, value2) {
        if (this.isTrigger) return false;
        return value1.every((v, i) => v == value2[i]);
    }
}