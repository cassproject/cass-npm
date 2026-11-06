/**
 *  AES encrypted public key and display name. Contains Initialization Vectors,
 *  but not secrets. Used to encrypt public identities for storage on remote
 *  systems.
 *
 *  @author fritz.ray@eduworks.com
 *  @class EbacContact
 *  @module org.cassproject
 */
module.exports = class EbacContact extends EcLinkedData {
	constructor() {
		super(Ebac.context, EbacContact.TYPE_0_4);
	}
	static TYPE_0_1 = "http://schema.eduworks.com/ebac/0.2/contact";
	static TYPE_0_2 = "http://schema.eduworks.com/ebac/0.2/contact";
	static TYPE_0_3 = "http://schema.cassproject.org/kbac/0.2/Contact";
	static TYPE_0_4 = "https://schema.cassproject.org/kbac/0.4/Contact";
	/**
	 *  AES Initialization Vector used to decode PPK. Base64 encoded.
	 *
	 *  @property iv
	 *  @type string
	 */
	iv = null;
	/**
	 *  AES encrypted Private Key in PEM format.
	 *
	 *  @property pk
	 *  @type string
	 */
	pk = null;
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
	/**
	 *  AES Initialization Vector of the home server of the contact. Base64 encoded.
	 *
	 *  @property sourceIv
	 *  @type string
	 */
	sourceIv = null;
	/**
	 *  URL to the home server of the contact.
	 *
	 *  @property source
	 *  @type string
	 */
	source = null;
	upgrade() {
		super.upgrade();
		if (EbacContact.TYPE_0_1 == (this.type)) {
			if (this["@context"] == null && this["@schema"] != null)
				this["@context"] = this["@schema"];
			this.setContextAndType(Ebac.context_0_2, EbacContact.TYPE_0_2);
		}
		if (EbacContact.TYPE_0_2 == (this.getFullType())) {
			this.setContextAndType(Ebac.context_0_3, EbacContact.TYPE_0_3);
		}
		if (EbacContact.TYPE_0_3 == (this.getFullType())) {
			this.setContextAndType(Ebac.context_0_4, EbacContact.TYPE_0_4);
		}
	}
	getTypes() {
		return [EbacContact.TYPE_0_4, EbacContact.TYPE_0_3, EbacContact.TYPE_0_2, EbacContact.TYPE_0_1];
	}
};
