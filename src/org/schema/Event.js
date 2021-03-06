/**
 * Schema.org/Event
 * An event happening at a certain time and location, such as a concert, lecture, or festival. Ticketing information may be added via the [[offers]] property. Repeated events may be structured as separate Event objects.
 *
 * @author schema.org
 * @class Event
 * @module org.schema
 */
module.exports = class Event extends EcRemoteLinkedData {
	/**
	 * Constructor, automatically sets @context and @type.
	 *
	 * @constructor
	 */
	constructor() {
		super();
		this.setContextAndType("http://schema.org/", "Event");
	}
};
