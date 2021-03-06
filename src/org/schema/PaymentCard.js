global.schema.FinancialProduct = require("./FinancialProduct.js");
/**
 * Schema.org/PaymentCard
 * A payment method using a credit, debit, store or other card to associate the payment with an account.
 *
 * @author schema.org
 * @class PaymentCard
 * @module org.schema
 * @extends FinancialProduct
 */
module.exports = class PaymentCard extends schema.FinancialProduct {
	/**
	 * Constructor, automatically sets @context and @type.
	 *
	 * @constructor
	 */
	constructor() {
		super();
		this.setContextAndType("http://schema.org/", "PaymentCard");
	}
};
