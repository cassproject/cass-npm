/**
 * Schema.org/HousePainter
 * A house painting service.
 *
 * @author schema.org
 * @class HousePainter
 * @module org.schema
 */
module.exports = class HousePainter extends EcRemoteLinkedData {
	/**
	 * Constructor, automatically sets @context and @type.
	 *
	 * @constructor
	 */
	constructor() {
		super();
		this.setContextAndType("http://schema.org/", "HousePainter");
	}
};
