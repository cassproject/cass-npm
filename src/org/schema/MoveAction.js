/**
 * Schema.org/MoveAction
 * The act of an agent relocating to a place.\n\nRelated actions:\n\n* [[TransferAction]]: Unlike TransferAction, the subject of the move is a living Person or Organization rather than an inanimate object.
 *
 * @author schema.org
 * @class MoveAction
 * @module org.schema
 */
module.exports = class MoveAction extends EcRemoteLinkedData {
	/**
	 * Constructor, automatically sets @context and @type.
	 *
	 * @constructor
	 */
	constructor() {
		super();
		this.setContextAndType("http://schema.org/", "MoveAction");
	}
};
