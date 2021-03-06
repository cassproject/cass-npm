/**
 * Schema.org/Preschool
 * A preschool.
 *
 * @author schema.org
 * @class Preschool
 * @module org.schema
 */
module.exports = class Preschool extends EcRemoteLinkedData {
	/**
	 * Constructor, automatically sets @context and @type.
	 *
	 * @constructor
	 */
	constructor() {
		super();
		this.setContextAndType("http://schema.org/", "Preschool");
	}
};
