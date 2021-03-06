/**
 * Schema.org/BusOrCoach
 * A bus (also omnibus or autobus) is a road vehicle designed to carry passengers. Coaches are luxury busses, usually in service for long distance travel.
 *
 * @author schema.org
 * @class BusOrCoach
 * @module org.schema
 */
module.exports = class BusOrCoach extends EcRemoteLinkedData {
	/**
	 * Constructor, automatically sets @context and @type.
	 *
	 * @constructor
	 */
	constructor() {
		super();
		this.setContextAndType("http://schema.org/", "BusOrCoach");
	}
};
