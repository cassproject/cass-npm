const Ebac = require("../../../../org/cassproject/schema/general/Ebac");
const EcLinkedData = require("../../../../org/json/ld/EcLinkedData");

/**
 *  Credential list along with one time pad and session-based token for use in
 *  commit actions.
 *
 *  @author fritz.ray@eduworks.com
 *  @class EbacCredentials
 *  @module org.cassproject
 */
module.exports = class EbacCredentials extends EcLinkedData {
	constructor() {
		super(Ebac.context, EbacCredentials.TYPE_0_4);
	}
	static TYPE_0_1 = "http://schema.eduworks.com/ebac/0.1/credentials";
	static TYPE_0_2 = "http://schema.eduworks.com/ebac/0.2/credentials";
	static TYPE_0_3 = "http://schema.cassproject.org/kbac/0.2/Credentials";
	static TYPE_0_4 = "https://schema.cassproject.org/kbac/0.4/Credentials";
	/**
	 *  One time pad that may be used in password recovery. Base64 encoded.
	 *
	 *  @property pad
	 *  @type string
	 */
	pad = null;
	/**
	 *  Token provided by server to use in commit actions.
	 *
	 *  @property token
	 *  @type string
	 */
	token = null;
	/**
	 *  Credential array.
	 *
	 *  @property credentials
	 *  @type EbacCredential[]
	 */
	credentials = null;
	/**
	 *  Contact array.
	 *
	 *  @property contacts
	 *  @type EbacContact[]
	 */
	contacts = null;
	upgrade() {
		super.upgrade();
		if (EbacCredentials.TYPE_0_1 == (this.type)) {
			if (this["@context"] == null && this["@schema"] != null)
				this["@context"] = this["@schema"];
			this.setContextAndType(Ebac.context_0_2, EbacCredentials.TYPE_0_2);
		}
		if (EbacCredentials.TYPE_0_2 == (this.getFullType())) {
			this.setContextAndType(Ebac.context_0_3, EbacCredentials.TYPE_0_3);
		}
		if (EbacCredentials.TYPE_0_3 == (this.getFullType())) {
			this.setContextAndType(Ebac.context_0_4, EbacCredentials.TYPE_0_4);
		}
	}
	getTypes() {
		return [EbacCredentials.TYPE_0_4, EbacCredentials.TYPE_0_3, EbacCredentials.TYPE_0_2, EbacCredentials.TYPE_0_1];
	}
};
