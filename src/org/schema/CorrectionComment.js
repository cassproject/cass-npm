/**
 * Schema.org/CorrectionComment
 * A [[comment]] that corrects [[CreativeWork]].
 *
 * @author schema.org
 * @class CorrectionComment
 * @module org.schema
 */
module.exports = class CorrectionComment extends EcRemoteLinkedData {
	/**
	 * Constructor, automatically sets @context and @type.
	 *
	 * @constructor
	 */
	constructor() {
		super();
		this.setContextAndType("http://schema.org/", "CorrectionComment");
	}
};
