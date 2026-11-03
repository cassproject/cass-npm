/**
 *  A representation of a file.
 *
 *  @author fritz.ray@eduworks.com
 *  @module com.eduworks.ec
 *  @class GeneralFile
 *  @extends EcRemoteLinkedData
 *  @constructor
 */
module.exports = class GeneralFile extends EcRemoteLinkedData {
	constructor() {
		super(General.context, GeneralFile.myType);
	}
	static TYPE_0_1 = "http://schema.eduworks.com/general/0.1/file"; // NOSONAR - JSON-LD identifier, never fetched
	static TYPE_0_2 = "http://schema.eduworks.com/general/0.2/file"; // NOSONAR - JSON-LD identifier, never fetched
	static myType = this.TYPE_0_2;
	/**
	 *  Optional checksum of the file, used to verify if the file has been
	 *  transmitted correctly.
	 *
	 *  @property checksum
	 *  @type String
	 */
	checksum = null;
	/**
	 *  Mime type of the file.
	 *
	 *  @property mimeType
	 *  @type String
	 */
	mimeType = null;
	/**
	 *  Base-64 encoded version of the bytestream of a file.
	 *
	 *  @property data
	 *  @type String
	 */
	data = null;
	/**
	 *  Name of the file, used to distinguish it
	 *
	 *  @property name
	 *  @type String
	 */
	name = null;
	/**
	 *  Helper method to force the browser to download the file.
	 *
	 *  @memberOf GeneralFile
	 *  @method download
	 */
	download() {
		let blob = base64ToBlob(this.data, this.mimeType);
		saveAs(blob, this.name);
	}
	upgrade() {
		super.upgrade();
		if (GeneralFile.TYPE_0_1 == (this.type)) {
			let me = this;
			if (me["@context"] == null && me["@schema"] != null)
				me["@context"] = me["@schema"];
			this.setContextAndType(General.context_0_2, GeneralFile.TYPE_0_2);
		}
	}
	getTypes() {
		let a = [];
		a.push(GeneralFile.TYPE_0_2);
		a.push(GeneralFile.TYPE_0_1);
		return a;
	}
};
