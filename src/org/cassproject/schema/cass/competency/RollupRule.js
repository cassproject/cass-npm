const Cass = require("../Cass.js");

const schema = {
	"CreativeWork": require("../../../../schema/CreativeWork.js")
};
/**
 *  A segment of script that defines in a domain specific language how competence is transferred from one competency to another.
 *
 *  @author fritz.ray@eduworks.com
 *  @class RollupRule
 *  @module org.cassproject
 *  @extends CreativeWork
 */
module.exports = class RollupRule extends schema.CreativeWork {
	constructor() {
		super();
		this.setContextAndType(Cass.context, RollupRule.myType);
	}
	static TYPE_0_2 = "http://schema.eduworks.com/cass/0.2/rollupRule";
	static TYPE_0_3 = "http://schema.cassproject.org/0.2/RollupRule";
	static TYPE_0_4 = "http://schema.cassproject.org/0.3/RollupRule";
	static TYPE_0_5 = "https://schema.cassproject.org/0.3/RollupRule";
	static TYPE_0_6 = "https://schema.cassproject.org/0.4/RollupRule";
	static myType = this.TYPE_0_6;
	/**
	 *  The rollup rule encoded as source code that is understandable to the assertion processor.
	 *
	 *  @property rule
	 *  @type string
	 */
	rule = null;
	/**
	 *  Specifies the URL of the competency that the rollup rule pertains to.
	 *
	 *  @property competency
	 *  @type string
	 */
	competency = null;
	upgrade() {
		super.upgrade();
		if (RollupRule.TYPE_0_2 == (this.getFullType())) {
			this.setContextAndType(Cass.context_0_3, RollupRule.TYPE_0_3);
		}
		if (RollupRule.TYPE_0_3 == (this.getFullType())) {
			this.setContextAndType(Cass.context_0_4, RollupRule.TYPE_0_4);
		}
		if (RollupRule.TYPE_0_4 == (this.getFullType())) {
			this.setContextAndType(Cass.context_0_5, RollupRule.TYPE_0_5);
		}
		if (RollupRule.TYPE_0_5 == (this.getFullType())) {
			this.setContextAndType(Cass.context_0_6, RollupRule.TYPE_0_6);
		}
	}
	getTypes() {
		return [
			RollupRule.TYPE_0_6,
			RollupRule.TYPE_0_5,
			RollupRule.TYPE_0_4,
			RollupRule.TYPE_0_3,
			RollupRule.TYPE_0_2,
		];
	}
};
