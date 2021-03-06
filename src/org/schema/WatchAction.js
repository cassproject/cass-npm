/**
 * Schema.org/WatchAction
 * The act of consuming dynamic/moving visual content.
 *
 * @author schema.org
 * @class WatchAction
 * @module org.schema
 */
module.exports = class WatchAction extends EcRemoteLinkedData {
	/**
	 * Constructor, automatically sets @context and @type.
	 *
	 * @constructor
	 */
	constructor() {
		super();
		this.setContextAndType("http://schema.org/", "WatchAction");
	}
};
