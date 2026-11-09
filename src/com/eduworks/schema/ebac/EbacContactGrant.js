/**
 *  AES encrypted public key and display name message.
 *  Used to grant access to a contact.
 *  Contains Initialization Vectors, but not secrets.
 *  Used to encrypt public identities for storage on remote systems.
 *
 *  @author fritz.ray@eduworks.com
 *  @class EbacContactGrant
 *  @module org.cassproject
 */
module.exports = class EbacContactGrant extends EcRemoteLinkedData {
	constructor() {
		super(Ebac.context, EbacContactGrant.TYPE_0_4);
	}
	static TYPE_0_1 = "http://schema.eduworks.com/ebac/0.1/contactGrant";
	static TYPE_0_2 = "http://schema.eduworks.com/ebac/0.2/contactGrant";
	static TYPE_0_3 = "http://schema.cassproject.org/kbac/0.2/ContactGrant";
	static TYPE_0_4 = "https://schema.cassproject.org/kbac/0.4/ContactGrant";
	/**
	 *  Public key being granted to the owner of this message.
	 *
	 *  @property pk
	 *  @type string(pem)
	 */
	pk = null;
	/**
	 *  Display name of the contact.
	 *
	 *  @property displayName
	 *  @type string
	 */
	displayName = null;
	/**
	 *  Source server of the contact.
	 *
	 *  @property source
	 *  @type string
	 */
	source = null;
	/**
	 *  Response token used to validate that this grant is in response to a contact request you sent.
	 *
	 *  @property responseToken
	 *  @type string
	 */
	responseToken = null;
	/**
	 *  Signature (Base64 encoded) of the response token to verify against your own public key
	 *  to ensure that this grant is in response to a contact request you sent.
	 *
	 *  @property responseSignature
	 *  @type string
	 */
	responseSignature = null;
	upgrade() {
		super.upgrade();
		if (EbacContactGrant.TYPE_0_1 == (this.type)) {
			if (this["@context"] == null && this["@schema"] != null)
				this["@context"] = this["@schema"];
			this.setContextAndType(Ebac.context_0_2, EbacContactGrant.TYPE_0_2);
		}
		if (EbacContactGrant.TYPE_0_2 == (this.getFullType())) {
			this.setContextAndType(Ebac.context_0_3, EbacContactGrant.TYPE_0_3);
		}
		if (EbacContactGrant.TYPE_0_3 == (this.getFullType())) {
			this.setContextAndType(Ebac.context_0_4, EbacContactGrant.TYPE_0_4);
		}
	}
	getTypes() {
		return [EbacContactGrant.TYPE_0_4, EbacContactGrant.TYPE_0_3, EbacContactGrant.TYPE_0_2, EbacContactGrant.TYPE_0_1];
	}
};
