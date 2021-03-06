/**
 * Schema.org/DeliveryChargeSpecification
 * The price for the delivery of an offer using a particular delivery method.
 *
 * @author schema.org
 * @class DeliveryChargeSpecification
 * @module org.schema
 */
module.exports = class DeliveryChargeSpecification extends EcRemoteLinkedData {
	/**
	 * Constructor, automatically sets @context and @type.
	 *
	 * @constructor
	 */
	constructor() {
		super();
		this.setContextAndType(
			"http://schema.org/",
			"DeliveryChargeSpecification"
		);
	}
};
