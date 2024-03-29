
module.exports = class TaskRequirementRevision extends EcRemoteLinkedData {
trRevId;
revChangeDescr;
revDate;
trDescr;
trDecision;
specResReq;
trJust;
changeReq;
docs;
rmks;
uid;
crud;

 getTrRevId() {
        return trRevId;
    }

 setTrRevId( value) {
        this.trRevId = value;
    }

 getRevChangeDescr() {
        return revChangeDescr;
    }

 setRevChangeDescr( value) {
        this.revChangeDescr = value;
    }

 getRevDate() {
        return revDate;
    }

 setRevDate( value) {
        this.revDate = value;
    }

 getTrDescr() {
        return trDescr;
    }

 setTrDescr( value) {
        this.trDescr = value;
    }

 getTrDecision() {
        return trDecision;
    }

 setTrDecision( value) {
        this.trDecision = value;
    }

 getSpecResReq() {
        if (this.specResReq == null) {
            this.specResReq = [];
        }
        return this.specResReq;
    }

 getTrJust() {
        if (this.trJust == null) {
            this.trJust = [];
        }
        return this.trJust;
    }

 getChangeReq() {
        if (this.changeReq == null) {
            this.changeReq = [];
        }
        return this.changeReq;
    }

 getDocs() {
        return docs;
    }

 setDocs( value) {
        this.docs = value;
    }

 getRmks() {
        return rmks;
    }

 setRmks( value) {
        this.rmks = value;
    }

 getUid() {
        return uid;
    }

 setUid( value) {
        this.uid = value;
    }

 getCrud() {
        if (this.crud == null) {
            return CrudCodeValues.I;
        } else {
            return crud;
        }
    }

 setCrud( value) {
        this.crud = value;
    }

	constructor() {
		super("http://www.asd-europe.org/s-series/s3000l", "TaskRequirementRevision");
	}
};
