/**
 * Schema.org/DrugCostCategory
 * Enumerated categories of medical drug costs.
 *
 * @author schema.org
 * @class DrugCostCategory
 * @module org.schema
 */
module.exports = class DrugCostCategory extends EcRemoteLinkedData {
	/**
	 * Constructor, automatically sets @context and @type.
	 *
	 * @constructor
	 */
	constructor() {
		super();
		this.setContextAndType("http://schema.org/", "DrugCostCategory");
	}
};
