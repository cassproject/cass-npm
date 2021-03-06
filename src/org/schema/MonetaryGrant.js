/**
 * Schema.org/MonetaryGrant
 * A monetary grant.
 *
 * @author schema.org
 * @class MonetaryGrant
 * @module org.schema
 */
module.exports = class MonetaryGrant extends EcRemoteLinkedData {
	/**
	 * Constructor, automatically sets @context and @type.
	 *
	 * @constructor
	 */
	constructor() {
		super();
		this.setContextAndType("http://schema.org/", "MonetaryGrant");
	}
};
