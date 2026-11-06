const Ebac = require("../../../../org/cassproject/schema/general/Ebac");
const EcLinkedData = require("../../../../org/json/ld/EcLinkedData");

/**
 *  Message used to retrieve credentials from a remote system.
 *
 *  @author fritz.ray@eduworks.com
 *  @class EbacCredentialRequest
 *  @module org.cassproject
 */
module.exports = class EbacCredentialRequest extends EcLinkedData {
	constructor() {
		super(Ebac.context, EbacCredentialRequest.TYPE_0_4);
	}
	static TYPE_0_1 = "http://schema.eduworks.com/ebac/0.1/credentialRequest";
	static TYPE_0_2 = "http://schema.eduworks.com/ebac/0.2/credentialRequest";
	static TYPE_0_3 =
		"http://schema.cassproject.org/kbac/0.2/CredentialRequest";
	static TYPE_0_4 =
		"https://schema.cassproject.org/kbac/0.4/CredentialRequest";
	/**
	 *  Hashed username.
	 *
	 *  @property username
	 *  @type string
	 */
	username = null;
	/**
	 *  Hashed password to authorize request.
	 *
	 *  @property password
	 *  @type string
	 */
	password = null;
	upgrade() {
		super.upgrade();
		if (EbacCredentialRequest.TYPE_0_1 == this.type) {
			if (this["@context"] == null && this["@schema"] != null)
				this["@context"] = this["@schema"];
			this.setContextAndType(
				Ebac.context_0_2,
				EbacCredentialRequest.TYPE_0_2
			);
		}
		if (EbacCredentialRequest.TYPE_0_2 == this.getFullType()) {
			this.setContextAndType(
				Ebac.context_0_3,
				EbacCredentialRequest.TYPE_0_3
			);
		}
		if (EbacCredentialRequest.TYPE_0_3 == this.getFullType()) {
			this.setContextAndType(
				Ebac.context_0_4,
				EbacCredentialRequest.TYPE_0_4
			);
		}
	}
	getTypes() {
		return [EbacCredentialRequest.TYPE_0_4, EbacCredentialRequest.TYPE_0_3, EbacCredentialRequest.TYPE_0_2, EbacCredentialRequest.TYPE_0_1];
	}
};
