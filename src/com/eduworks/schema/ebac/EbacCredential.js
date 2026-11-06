const Ebac = require("../../../../org/cassproject/schema/general/Ebac");
const EcLinkedData = require("../../../../org/json/ld/EcLinkedData");

/**
 *  AES encrypted private key and display name. Contains Initialization Vectors,
 *  but not secrets. Used to encrypt private identities for storage on remote
 *  systems.
 *
 *  @author fritz.ray@eduworks.com
 *  @class EbacCredential
 *  @module org.cassproject
 */
module.exports = class EbacCredential extends EcLinkedData {
	constructor() {
		super(Ebac.context, EbacCredential.TYPE_0_4);
	}
	static TYPE_0_1 = "http://schema.eduworks.com/ebac/0.1/credential";
	static TYPE_0_2 = "http://schema.eduworks.com/ebac/0.2/credential";
	static TYPE_0_3 = "http://schema.cassproject.org/kbac/0.2/Credential";
	static TYPE_0_4 = "https://schema.cassproject.org/kbac/0.4/Credential";
	/**
	 *  AES Initialization Vector used to decode PPK. Base64 encoded.
	 *
	 *  @property iv
	 *  @type string
	 */
	iv = null;
	/**
	 *  AES encrypted Private Key in PEM form.
	 *
	 *  @property ppk
	 *  @type string
	 */
	ppk = null;
	/**
	 *  AES Initialization Vector used to decode displayName. Base64 encoded.
	 *
	 *  @property displayNameIv
	 *  @type string
	 */
	displayNameIv = null;
	/**
	 *  AES encrypted display name for identity.
	 *
	 *  @property displayName
	 *  @type string
	 */
	displayName = null;
	upgrade() {
		super.upgrade();
		if (EbacCredential.TYPE_0_1 == (this.type)) {
			if (this["@context"] == null && this["@schema"] != null)
				this["@context"] = this["@schema"];
			this.setContextAndType(Ebac.context_0_2, EbacCredential.TYPE_0_2);
		}
		if (EbacCredential.TYPE_0_2 == (this.getFullType())) {
			this.setContextAndType(Ebac.context_0_3, EbacCredential.TYPE_0_3);
		}
		if (EbacCredential.TYPE_0_3 == (this.getFullType())) {
			this.setContextAndType(Ebac.context_0_4, EbacCredential.TYPE_0_4);
		}
	}
	getTypes() {
		return [EbacCredential.TYPE_0_4, EbacCredential.TYPE_0_3, EbacCredential.TYPE_0_2, EbacCredential.TYPE_0_1];
	}
};
