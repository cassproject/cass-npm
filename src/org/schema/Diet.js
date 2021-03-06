global.schema.CreativeWork = require("./CreativeWork.js");
/**
 * Schema.org/Diet
 * A strategy of regulating the intake of food to achieve or maintain a specific health-related goal.
 *
 * @author schema.org
 * @class Diet
 * @module org.schema
 * @extends CreativeWork
 */
module.exports = class Diet extends schema.CreativeWork {
	/**
	 * Constructor, automatically sets @context and @type.
	 *
	 * @constructor
	 */
	constructor() {
		super();
		this.setContextAndType("http://schema.org/", "Diet");
	}
};
