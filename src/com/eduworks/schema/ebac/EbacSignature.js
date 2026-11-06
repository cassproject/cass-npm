const Ebac = require("../../../../org/cassproject/schema/general/Ebac");
const EcLinkedData = require("../../../../org/json/ld/EcLinkedData");

/**
 *  Signature used to authorize movement of data on behalf of a private-key
 *  holding owner.
 *
 *  @author fritz.ray@eduworks.com
 *  @class EbacSignature
 *  @module org.cassproject
 */
module.exports = class EbacSignature extends EcLinkedData {
	constructor() {
		super(Ebac.context, EbacSignature.TYPE_0_4);
	}
	static TYPE_0_1 =
		"http://schema.eduworks.com/ebac/0.1/timeLimitedSignature";
	static TYPE_0_2 =
		"http://schema.eduworks.com/ebac/0.2/timeLimitedSignature";
	static TYPE_0_3 =
		"http://schema.cassproject.org/kbac/0.2/TimeLimitedSignature";
	static TYPE_0_4 =
		"https://schema.cassproject.org/kbac/0.4/TimeLimitedSignature";
	/**
	 *  The public key of the authorizing party in PEM format.
	 *
	 *  @property owner
	 *  @type string
	 */
	owner = null;
	/**
	 *  The time in number of milliseconds since midnight of January 1, 1970
	 *  00:00:00 UTC that this signature is authorized to move data.
	 *
	 *  @property expiry
	 *  @type long
	 */
	expiry = null;
	/**
	 *  The signature of this object, having signed the object, having been
	 *  encoded in JSON with no space or tabs in ASCII sort order, having no
	 *  value for the signature at the time of signing.
	 *
	 *  @property signature
	 *  @type string
	 */
	signature = null;
	/**
	 *  The server authorized to move data. If this is empty, the signature may
	 *  be used by a server to ask for data from other servers.
	 *
	 *  @property server
	 *  @type string
	 */
	server = null;
	upgrade() {
		super.upgrade();
	}
	getTypes() {
		return [EbacSignature.TYPE_0_4, EbacSignature.TYPE_0_3, EbacSignature.TYPE_0_2, EbacSignature.TYPE_0_1];
	}
};
