/**
 *  Created by fray on 5/9/17.
 */
module.exports = class VideoStory extends schema.VideoObject {
	/**
	 *  Constructor, automatically sets @context and @type.
	 *
	 *  @constructor
	 */
	constructor() {
		super();
		this.context = "http://schema.eduworks.com/angles/0.1/"; // NOSONAR - JSON-LD identifier, never fetched
		this.type = "VideoStory";
	}
	/**
	 *  The starting time of this story WRT the start of the video. In ISO 8601 Duration format.
	 */
	startTime = null;
};
