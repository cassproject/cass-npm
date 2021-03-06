/**
 * Schema.org/PaymentService
 * A Service to transfer funds from a person or organization to a beneficiary person or organization.
 *
 * @author schema.org
 * @class PaymentService
 * @module org.schema
 */
module.exports = class PaymentService extends EcRemoteLinkedData {
	/**
	 * Constructor, automatically sets @context and @type.
	 *
	 * @constructor
	 */
	constructor() {
		super();
		this.setContextAndType("http://schema.org/", "PaymentService");
	}
};
