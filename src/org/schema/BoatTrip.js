/**
 * Schema.org/BoatTrip
 * A trip on a commercial ferry line.
 *
 * @author schema.org
 * @class BoatTrip
 * @module org.schema
 */
module.exports = class BoatTrip extends EcRemoteLinkedData {
	/**
	 * Constructor, automatically sets @context and @type.
	 *
	 * @constructor
	 */
	constructor() {
		super();
		this.setContextAndType("http://schema.org/", "BoatTrip");
	}
};
