/**
 * Schema.org/ItemAvailability
 * A list of possible product availability options.
 *
 * @author schema.org
 * @class ItemAvailability
 * @module org.schema
 */
module.exports = class ItemAvailability extends EcRemoteLinkedData {
	/**
	 * Constructor, automatically sets @context and @type.
	 *
	 * @constructor
	 */
	constructor() {
		super();
		this.setContextAndType("http://schema.org/", "ItemAvailability");
	}
};
