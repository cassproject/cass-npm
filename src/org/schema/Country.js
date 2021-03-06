/**
 * Schema.org/Country
 * A country.
 *
 * @author schema.org
 * @class Country
 * @module org.schema
 */
module.exports = class Country extends EcRemoteLinkedData {
	/**
	 * Constructor, automatically sets @context and @type.
	 *
	 * @constructor
	 */
	constructor() {
		super();
		this.setContextAndType("http://schema.org/", "Country");
	}
};
