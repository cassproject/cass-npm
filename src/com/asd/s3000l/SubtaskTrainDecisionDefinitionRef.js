
const CrudCodeValues = require("./CrudCodeValues");
module.exports = class SubtaskTrainDecisionDefinitionRef extends EcRemoteLinkedData {
    taskId;
    taskRevId;
    iterationId;
    subtTrainId;
    uidRef;
    uriRef;

    getTaskId() {
        return this.taskId;
    }

    setTaskId(value) {
        this.taskId = value;
    }

    getTaskRevId() {
        return this.taskRevId;
    }

    setTaskRevId(value) {
        this.taskRevId = value;
    }

    getIterationId() {
        return this.iterationId;
    }

    setIterationId(value) {
        this.iterationId = value;
    }

    getSubtTrainId() {
        return this.subtTrainId;
    }

    setSubtTrainId(value) {
        this.subtTrainId = value;
    }

    getUidRef() {
        return this.uidRef;
    }

    setUidRef(value) {
        this.uidRef = value;
    }

    getUriRef() {
        return this.uriRef;
    }

    setUriRef(value) {
        this.uriRef = value;
    }

    constructor() {
        super("http://www.asd-europe.org/s-series/s3000l", "SubtaskTrainDecisionDefinitionRef");
    }
};
