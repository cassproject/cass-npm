/**
 * Schema.org/DepartAction
 * The act of  departing from a place. An agent departs from an fromLocation for a destination, optionally with participants.
 *
 * @author schema.org
 * @class DepartAction
 * @module org.schema
 */
module.exports = class DepartAction extends EcRemoteLinkedData {
	/**
	 * Constructor, automatically sets @context and @type.
	 *
	 * @constructor
	 */
	constructor() {
		super();
		this.setContextAndType("http://schema.org/", "DepartAction");
	}
};
