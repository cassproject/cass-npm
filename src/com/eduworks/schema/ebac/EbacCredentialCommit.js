const Ebac = require("../../../../org/cassproject/schema/general/Ebac");
const EcLinkedData = require("../../../../org/json/ld/EcLinkedData");
const EbacCredentials = require("./EbacCredentials");

/**
 *  Message used to commit credentials to a remote login server.
 *
 *  @author fritz.ray@eduworks.com
 *  @class EbacCredentialCommit
 *  @module org.cassproject
 */
module.exports = class EbacCredentialCommit extends EcLinkedData {
	constructor() {
		super(Ebac.context, EbacCredentialCommit.TYPE_0_4);
		this.credentials = new EbacCredentials();
	}
	static TYPE_0_1 = "http://schema.eduworks.com/ebac/0.1/credentialCommit";
	static TYPE_0_2 = "http://schema.eduworks.com/ebac/0.2/credentialCommit";
	static TYPE_0_3 = "http://schema.cassproject.org/kbac/0.2/CredentialCommit";
	static TYPE_0_4 = "https://schema.cassproject.org/kbac/0.4/CredentialCommit";
	/**
	 *  Hashed username.
	 *
	 *  @property username
	 *  @type string
	 */
	username = null;
	/**
	 *  Hashed password to authorize commit.
	 *
	 *  @property password
	 *  @type string
	 */
	password = null;
	/**
	 *  Token provided to client when previously executed Request was done. May
	 *  be empty if this is used as part of Create action.
	 *
	 *  @property token
	 *  @type string
	 */
	token = null;
	/**
	 *  List of credentials to commit to the login server storage.
	 *
	 *  @property credentials
	 *  @type EbacCredentials
	 */
	credentials = null;
	upgrade() {
		super.upgrade();
		if (EbacCredentialCommit.TYPE_0_1 == (this.type)) {
			if (this["@context"] == null && this["@schema"] != null)
				this["@context"] = this["@schema"];
			this.setContextAndType(
				Ebac.context_0_2,
				EbacCredentialCommit.TYPE_0_2
			);
		}
		if (EbacCredentialCommit.TYPE_0_2 == (this.getFullType())) {
			this.setContextAndType(
				Ebac.context_0_3,
				EbacCredentialCommit.TYPE_0_3
			);
		}
		if (EbacCredentialCommit.TYPE_0_3 == (this.getFullType())) {
			this.setContextAndType(
				Ebac.context_0_4,
				EbacCredentialCommit.TYPE_0_4
			);
		}
	}
	getTypes() {
		return [EbacCredentialCommit.TYPE_0_4, EbacCredentialCommit.TYPE_0_3, EbacCredentialCommit.TYPE_0_2, EbacCredentialCommit.TYPE_0_1];
	}
};
