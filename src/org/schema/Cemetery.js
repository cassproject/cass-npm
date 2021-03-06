/**
 * Schema.org/Cemetery
 * A graveyard.
 *
 * @author schema.org
 * @class Cemetery
 * @module org.schema
 */
module.exports = class Cemetery extends EcRemoteLinkedData {
	/**
	 * Constructor, automatically sets @context and @type.
	 *
	 * @constructor
	 */
	constructor() {
		super();
		this.setContextAndType("http://schema.org/", "Cemetery");
	}
};
