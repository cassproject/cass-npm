/**
 * Schema.org/OceanBodyOfWater
 * An ocean (for example, the Pacific).
 *
 * @author schema.org
 * @class OceanBodyOfWater
 * @module org.schema
 */
module.exports = class OceanBodyOfWater extends EcRemoteLinkedData {
	/**
	 * Constructor, automatically sets @context and @type.
	 *
	 * @constructor
	 */
	constructor() {
		super();
		this.setContextAndType("http://schema.org/", "OceanBodyOfWater");
	}
};
