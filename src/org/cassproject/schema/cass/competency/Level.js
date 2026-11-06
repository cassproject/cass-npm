const Cass = require("../Cass.js");

const schema = {
	"CreativeWork": require("../../../../schema/CreativeWork.js")
};
/**
 *  When an individual's performance in a competency can be measured, a level specifies milestones that an individual can reach, creating fine-grained distinction between the proficient and the adept.
 *
 *  @author fritz.ray@eduworks.com
 *  @class Level
 *  @module org.cassproject
 *  @extends CreativeWork
 */
module.exports = class Level extends schema.CreativeWork {
	constructor() {
		super();
		this.setContextAndType(Cass.context, Level.myType);
	}
	static TYPE_0_1 = "http://schema.eduworks.com/cass/0.1/level";
	static TYPE_0_2 = "http://schema.eduworks.com/cass/0.2/level";
	static TYPE_0_3 = "http://schema.cassproject.org/0.2/Level";
	static TYPE_0_4 = "http://schema.cassproject.org/0.3/Level";
	static TYPE_0_5 = "https://schema.cassproject.org/0.3/Level";
	static TYPE_0_6 = "https://schema.cassproject.org/0.4/Level";
	static myType = this.TYPE_0_6;
	/**
	 *  Specifies the URL of the competency this level relates to.
	 *
	 *  @property competency
	 *  @type string(URL)
	 */
	competency = null;
	/**
	 *  The title that one who holds this performance level may assume.
	 *
	 *  @property title
	 *  @type string
	 */
	title = null;
	/**
	 *  The performance characteristics required by this level in text form.
	 *  FR - Represented by description.
	 *
	 *  @property performance
	 *  @type string
	 */
	performance = null;
	upgrade() {
		super.upgrade();
		if (Level.TYPE_0_1 == (this.type)) {
			if (this["@context"] == null && this["@schema"] != null)
				this["@context"] = this["@schema"];
			this.setContextAndType(Cass.context_0_2, Level.TYPE_0_2);
		}
		if (Level.TYPE_0_2 == (this.getFullType())) {
			this.setContextAndType(Cass.context_0_3, Level.TYPE_0_3);
		}
		if (Level.TYPE_0_3 == (this.getFullType())) {
			this.setContextAndType(Cass.context_0_4, Level.TYPE_0_4);
		}
		if (Level.TYPE_0_4 == (this.getFullType())) {
			this.setContextAndType(Cass.context_0_5, Level.TYPE_0_5);
		}
		if (Level.TYPE_0_5 == (this.getFullType())) {
			this.setContextAndType(Cass.context_0_6, Level.TYPE_0_6);
		}
	}
	getTypes() {
		return [
			Level.TYPE_0_6,
			Level.TYPE_0_5,
			Level.TYPE_0_4,
			Level.TYPE_0_3,
			Level.TYPE_0_2,
			Level.TYPE_0_1,
		];
	}
};
