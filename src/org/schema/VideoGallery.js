/**
 * Schema.org/VideoGallery
 * Web page type: Video gallery page.
 *
 * @author schema.org
 * @class VideoGallery
 * @module org.schema
 */
module.exports = class VideoGallery extends EcRemoteLinkedData {
	/**
	 * Constructor, automatically sets @context and @type.
	 *
	 * @constructor
	 */
	constructor() {
		super();
		this.setContextAndType("http://schema.org/", "VideoGallery");
	}
};
