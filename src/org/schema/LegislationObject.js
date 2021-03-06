global.schema.MediaObject = require("./MediaObject.js");
/**
 * Schema.org/LegislationObject
 * A specific object or file containing a Legislation. Note that the same Legislation can be published in multiple files. For example, a digitally signed PDF, a plain PDF and an HTML version.
 *
 * @author schema.org
 * @class LegislationObject
 * @module org.schema
 * @extends MediaObject
 */
module.exports = class LegislationObject extends schema.MediaObject {
	/**
	 * Constructor, automatically sets @context and @type.
	 *
	 * @constructor
	 */
	constructor() {
		super();
		this.setContextAndType("http://schema.org/", "LegislationObject");
	}
};
