
const CrudCodeValues = require("./CrudCodeValues");
module.exports = class LearningObjectiveTrainingStrategy extends EcRemoteLinkedData {
    trainStrName;
    trainComp;
    assessmnts;
    orgInfos;
    docs;
    rmks;
    uid;
    uri;
    crud;

    getTrainStrName() {
        if (this.trainStrName == null) {
            this.trainStrName = [];
        }
        return this.trainStrName;
    }

    getTrainComp() {
        if (this.trainComp == null) {
            this.trainComp = [];
        }
        return this.trainComp;
    }

    getAssessmnts() {
        return this.assessmnts;
    }

    setAssessmnts(value) {
        this.assessmnts = value;
    }

    getOrgInfos() {
        return this.orgInfos;
    }

    setOrgInfos(value) {
        this.orgInfos = value;
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

    getUri() {
        return this.uri;
    }

    setUri(value) {
        this.uri = value;
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
        super("http://www.asd-europe.org/s-series/s3000l", "LearningObjectiveTrainingStrategy");
    }
};
