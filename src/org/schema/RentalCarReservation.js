/**
 * Schema.org/RentalCarReservation
 * A reservation for a rental car.\n\nNote: This type is for information about actual reservations, e.g. in confirmation emails or HTML pages with individual confirmations of reservations.
 *
 * @author schema.org
 * @class RentalCarReservation
 * @module org.schema
 */
module.exports = class RentalCarReservation extends EcRemoteLinkedData {
	/**
	 * Constructor, automatically sets @context and @type.
	 *
	 * @constructor
	 */
	constructor() {
		super();
		this.setContextAndType("http://schema.org/", "RentalCarReservation");
	}
};
