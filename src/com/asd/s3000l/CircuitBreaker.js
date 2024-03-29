
module.exports = class CircuitBreaker extends EcRemoteLinkedData {
cbId;
name;
cbType;
docs;
rmks;
uid;
crud;

 getCbId() {
        return cbId;
    }

 setCbId( value) {
        this.cbId = value;
    }

 getName() {
        return name;
    }

 setName( value) {
        this.name = value;
    }

 getCbType() {
        return cbType;
    }

 setCbType( value) {
        this.cbType = value;
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
		super("http://www.asd-europe.org/s-series/s3000l", "CircuitBreaker");
	}
};
