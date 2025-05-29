const Ebac = require("../../../../org/cassproject/schema/general/Ebac");
const EcRemoteLinkedData = require("../../../../org/cassproject/schema/general/EcRemoteLinkedData");

/**
 *  Encrypted JSON-LD object or string.
 *
 *  @author fritz.ray@eduworks.com
 *  @class EbacEncryptedValue
 *  @module org.cassproject
 */
module.exports = class EbacEncryptedValue extends EcRemoteLinkedData {
	constructor() {
		super(Ebac.context, EbacEncryptedValue.myType);
	}
	static TYPE_0_1 = "http://schema.eduworks.com/ebac/0.1/encryptedValue";
	static TYPE_0_2 = "http://schema.eduworks.com/ebac/0.2/encryptedValue";
	static TYPE_0_3 = "http://schema.cassproject.org/kbac/0.2/EncryptedValue";
	static TYPE_0_4 = "https://schema.cassproject.org/kbac/0.4/EncryptedValue";
	static myType = this.TYPE_0_4;
	/**
	 *  Optional Hint used to aid in search.
	 *  Displays the type of the encrypted object.
	 *
	 *  @property encryptedType
	 *  @type string
	 */
	encryptedType = null;
	/**
	 *  Optional Hint used to aid in search.
	 *  Displays the context of the encrypted object.
	 *
	 *  @property encryptedContext
	 *  @type string
	 */
	encryptedContext = null;
	/**
	 *  Base-64 encoded, AES encrypted form of the encrypted object (or string).
	 *
	 *  @property payload
	 *  @type string
	 */
	payload = null;
	/**
	 *  Optional Hint used to aid in search and display.
	 *  Name of the inner encrypted object.
	 *
	 *  @property name
	 *  @type string
	 */
	name = null;
	/**
	 *  Array of EbacEncryptedSecret objects encoded in Base-64, encrypted using
	 *  RSA public keys of owners, readers, or other parties to allow them
	 *  access to the payload.
	 *
	 *  @property secret
	 *  @type string[]
	 */
	secret = null;
	/**
	 *  IV of the AES encryption used to encrypt the payload.
	 *
	 *  @property iv
	 *  @type string
	 */
	iv = null;
	copyFrom(that) {
		let me = this;
		for (let key in me) delete me[key];
		let you = that;
		for (let key in you) {
			if (me[key] == null) me[key.replace("@", "")] = you[key];
		}
		if (!this.isAny(this.getTypes()))
			throw new Error("Incompatible type: " + this.getFullType());
	}
	upgrade() {
		super.upgrade();
		if (EbacEncryptedValue.TYPE_0_1 == this.type) {
			let me = this;
			if (me["@context"] == null && me["@schema"] != null)
				me["@context"] = me["@schema"];
			this.setContextAndType(
				Ebac.context_0_2,
				EbacEncryptedValue.TYPE_0_2
			);
		}
		if (EbacEncryptedValue.TYPE_0_2 == this.getFullType()) {
			this.setContextAndType(
				Ebac.context_0_3,
				EbacEncryptedValue.TYPE_0_3
			);
		}
		if (EbacEncryptedValue.TYPE_0_3 == this.getFullType()) {
			this.setContextAndType(
				Ebac.context_0_4,
				EbacEncryptedValue.TYPE_0_4
			);
		}
	}
	getTypes() {
		let a = [];
		a.push(EbacEncryptedValue.TYPE_0_4);
		a.push(EbacEncryptedValue.TYPE_0_3);
		a.push(EbacEncryptedValue.TYPE_0_2);
		a.push(EbacEncryptedValue.TYPE_0_1);
		return a;
	}
};
