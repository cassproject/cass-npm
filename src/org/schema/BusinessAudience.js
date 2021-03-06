/**
 * Schema.org/BusinessAudience
 * A set of characteristics belonging to businesses, e.g. who compose an item's target audience.
 *
 * @author schema.org
 * @class BusinessAudience
 * @module org.schema
 */
module.exports = class BusinessAudience extends EcRemoteLinkedData {
	/**
	 * Constructor, automatically sets @context and @type.
	 *
	 * @constructor
	 */
	constructor() {
		super();
		this.setContextAndType("http://schema.org/", "BusinessAudience");
	}
};
