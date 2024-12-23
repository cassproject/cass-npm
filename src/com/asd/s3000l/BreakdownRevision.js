

const CrudCodeValues = require("./CrudCodeValues");
module.exports = class BreakdownRevision extends EcRemoteLinkedData {
    bkdnRevId;
    status;
    bkdnRevDate;
    beUsage;
    docs;
    rmks;
    uid;
    crud;

    getBkdnRevId() {
        return this.bkdnRevId;
    }

    setBkdnRevId(value) {
        this.bkdnRevId = value;
    }

    getStatus() {
        return this.status;
    }

    setStatus(value) {
        this.status = value;
    }

    getBkdnRevDate() {
        return this.bkdnRevDate;
    }

    setBkdnRevDate(value) {
        this.bkdnRevDate = value;
    }

    getBeUsage() {
        if (this.beUsage == null) {
            this.beUsage = [];
        }
        return this.beUsage;
    }

    getDocs() {
        return this.docs;
    }

    setDocs(value) {
        this.docs = value;
    }

    getRmks() {
        return this.rmks;
    }

    setRmks(value) {
        this.rmks = value;
    }

    getUid() {
        return this.uid;
    }

    setUid(value) {
        this.uid = value;
    }

    getCrud() {
        if (this.crud == null) {
            return CrudCodeValues.I;
        } else {
            return this.crud;
        }
    }

    setCrud(value) {
        this.crud = value;
    }

    constructor() {
        super("http://www.asd-europe.org/s-series/s3000l", "BreakdownRevision");
    }
};
