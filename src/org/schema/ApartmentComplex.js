/**
 * Schema.org/ApartmentComplex
 * Residence type: Apartment complex.
 *
 * @author schema.org
 * @class ApartmentComplex
 * @module org.schema
 */
module.exports = class ApartmentComplex extends EcRemoteLinkedData {
	/**
	 * Constructor, automatically sets @context and @type.
	 *
	 * @constructor
	 */
	constructor() {
		super();
		this.setContextAndType("http://schema.org/", "ApartmentComplex");
	}
};
