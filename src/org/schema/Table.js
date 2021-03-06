/**
 * Schema.org/Table
 * A table on a Web page.
 *
 * @author schema.org
 * @class Table
 * @module org.schema
 */
module.exports = class Table extends EcRemoteLinkedData {
	/**
	 * Constructor, automatically sets @context and @type.
	 *
	 * @constructor
	 */
	constructor() {
		super();
		this.setContextAndType("http://schema.org/", "Table");
	}
};
