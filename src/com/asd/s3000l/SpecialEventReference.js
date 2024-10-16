
const CrudCodeValues = require("./CrudCodeValues");
module.exports = class SpecialEventReference extends EcRemoteLinkedData {
    evntTitle;
    uidRef;

    getEvntTitle() {
        return this.evntTitle;
    }

    setEvntTitle(value) {
        this.evntTitle = value;
    }

    getUidRef() {
        return this.uidRef;
    }

    setUidRef(value) {
        this.uidRef = value;
    }

    constructor() {
        super("http://www.asd-europe.org/s-series/s3000l", "SpecialEventReference");
    }
};
