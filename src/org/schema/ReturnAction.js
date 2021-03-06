/**
 * Schema.org/ReturnAction
 * The act of returning to the origin that which was previously received (concrete objects) or taken (ownership).
 *
 * @author schema.org
 * @class ReturnAction
 * @module org.schema
 */
module.exports = class ReturnAction extends EcRemoteLinkedData {
	/**
	 * Constructor, automatically sets @context and @type.
	 *
	 * @constructor
	 */
	constructor() {
		super();
		this.setContextAndType("http://schema.org/", "ReturnAction");
	}
};
