/**
 * Schema.org/HealthAndBeautyBusiness
 * Health and beauty.
 *
 * @author schema.org
 * @class HealthAndBeautyBusiness
 * @module org.schema
 */
module.exports = class HealthAndBeautyBusiness extends EcRemoteLinkedData {
	/**
	 * Constructor, automatically sets @context and @type.
	 *
	 * @constructor
	 */
	constructor() {
		super();
		this.setContextAndType("http://schema.org/", "HealthAndBeautyBusiness");
	}
};
