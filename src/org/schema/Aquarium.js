/**
 * Schema.org/Aquarium
 * Aquarium.
 *
 * @author schema.org
 * @class Aquarium
 * @module org.schema
 */
module.exports = class Aquarium extends EcRemoteLinkedData {
	/**
	 * Constructor, automatically sets @context and @type.
	 *
	 * @constructor
	 */
	constructor() {
		super();
		this.setContextAndType("http://schema.org/", "Aquarium");
	}
};
