export class Parameter {
    client;
    node;
    valueChangedCallback;

    constructor(client, node, valueChangedCallback) {
        this.client = client;
        this.valueChangedCallback = valueChangedCallback;

        if (typeof (node) === "string") {
            this.node = this.client.getNode(address);
        } else {
            this.node = node;
        }

        console.log(this.node);
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
        if (this.valueChangedCallback) this.valueChangedCallback(value);
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


    //Handlers from editor
    setValue(value, forceSend) {
        if (this.valueIsTheSame(value, this.node.value) && !forceSend) return;
        this.client.setValue(this.node, value);
    }

    setRange(min, max) {
        this.client.setRange(this.node, min, max);
    }

    //Checkers
    valueIsTheSame(value1, value2) {
        if (value1.length != value2.length) return false;
        return value1.every((v, i) => v == value2[i]);
    }
}