/**
 * Schema.org/SelfStorage
 * A self-storage facility.
 *
 * @author schema.org
 * @class SelfStorage
 * @module org.schema
 */
module.exports = class SelfStorage extends EcRemoteLinkedData {
	/**
	 * Constructor, automatically sets @context and @type.
	 *
	 * @constructor
	 */
	constructor() {
		super();
		this.setContextAndType("http://schema.org/", "SelfStorage");
	}
};
