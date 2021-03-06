/**
 * Schema.org/ShareAction
 * The act of distributing content to people for their amusement or edification.
 *
 * @author schema.org
 * @class ShareAction
 * @module org.schema
 */
module.exports = class ShareAction extends EcRemoteLinkedData {
	/**
	 * Constructor, automatically sets @context and @type.
	 *
	 * @constructor
	 */
	constructor() {
		super();
		this.setContextAndType("http://schema.org/", "ShareAction");
	}
};
