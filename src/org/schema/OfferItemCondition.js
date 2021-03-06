/**
 * Schema.org/OfferItemCondition
 * A list of possible conditions for the item.
 *
 * @author schema.org
 * @class OfferItemCondition
 * @module org.schema
 */
module.exports = class OfferItemCondition extends EcRemoteLinkedData {
	/**
	 * Constructor, automatically sets @context and @type.
	 *
	 * @constructor
	 */
	constructor() {
		super();
		this.setContextAndType("http://schema.org/", "OfferItemCondition");
	}
};
