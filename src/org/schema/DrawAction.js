/**
 * Schema.org/DrawAction
 * The act of producing a visual/graphical representation of an object, typically with a pen/pencil and paper as instruments.
 *
 * @author schema.org
 * @class DrawAction
 * @module org.schema
 */
module.exports = class DrawAction extends EcRemoteLinkedData {
	/**
	 * Constructor, automatically sets @context and @type.
	 *
	 * @constructor
	 */
	constructor() {
		super();
		this.setContextAndType("http://schema.org/", "DrawAction");
	}
};
