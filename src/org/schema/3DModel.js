const schema = {};
schema.MediaObject = require("./MediaObject.js");
/**
 * Schema.org/3DModel
 * A 3D model represents some kind of 3D content, which may have [[encoding]]s in one or more [[MediaObject]]s. Many 3D formats are available (e.g. see [Wikipedia](https://en.wikipedia.org/wiki/Category:3D_graphics_file_formats)); specific encoding formats can be represented using the [[encodingFormat]] property applied to the relevant [[MediaObject]]. For the
case of a single file published after Zip compression, the convention of appending '+zip' to the [[encodingFormat]] can be used. Geospatial, AR/VR, artistic/animation, gaming, engineering and scientific content can all be represented using [[3DModel]].
 *
 * @author schema.org
 * @class ThreeDModel
 * @module org.schema
 * @extends MediaObject
 */
module.exports = class ThreeDModel extends schema.MediaObject {
	/**
	 * Constructor, automatically sets @context and @type.
	 *
	 * @constructor
	 */
	constructor() {
		super();
		this.setContextAndType("http://schema.org/","3DModel");
	}

	/**
	 * Schema.org/isResizable
	 * Whether the 3DModel allows resizing. For example, room layout applications often do not allow 3DModel elements to be resized to reflect reality.
	 *
	 * @property isResizable
	 * @type Boolean
	 */
	isResizable;

}