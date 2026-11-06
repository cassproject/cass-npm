const Cass = require("../Cass.js");

const schema = {
	"CreativeWork": require("../../../../schema/CreativeWork.js")
};
/**
 *  A Competency Framework or simply Framework is a collection of competencies and relations between competencies in the framework and potentially between competencies in the framework and competencies in other frameworks. In practice, a Framework represents competencies related to a specific job, task, organization, career, knowledge domain, etc.
 *
 *  @author fritz.ray@eduworks.com
 *  @class Framework
 *  @module org.cassproject
 *  @extends CreativeWork
 */
module.exports = class Framework extends schema.CreativeWork {
	constructor() {
		super();
		this.setContextAndType(Cass.context, Framework.myType);
	}
	static TYPE_0_1 = "http://schema.eduworks.com/cass/0.1/framework";
	static TYPE_0_2 = "http://schema.eduworks.com/cass/0.2/framework";
	static TYPE_0_3 = "http://schema.cassproject.org/0.2/Framework";
	static TYPE_0_4 = "http://schema.cassproject.org/0.3/Framework";
	static TYPE_0_5 = "https://schema.cassproject.org/0.3/Framework";
	static TYPE_0_6 = "https://schema.cassproject.org/0.4/Framework";
	static myType = this.TYPE_0_6;
	/**
	 *  URLs of competencies included in this framework.
	 *
	 *  @property competency
	 *  @type string[]
	 */
	competency = null;
	/**
	 *  URLs of relations included in this framework.
	 *
	 *  @property relation
	 *  @type string[]
	 */
	relation = null;
	/**
	 *  URLs of levels included in this framework.
	 *
	 *  @property level
	 *  @type string[]
	 */
	level = null;
	/**
	 *  URLs of RollupRules included in this framework.
	 *
	 *  @property rollupRule
	 *  @type string[]
	 */
	rollupRule = null;
	/**
	 *  URL of the directory this framework is in.
	 *
	 *  @property rollupRule
	 *  @type string[]
	 */
	directory = null;
	upgrade() {
		super.upgrade();
		if (Framework.TYPE_0_1 == (this.type)) {
			if (this["@context"] == null && this["@schema"] != null)
				this["@context"] = this["@schema"];
			this.setContextAndType(Cass.context_0_2, Framework.TYPE_0_2);
		}
		if (Framework.TYPE_0_2 == (this.getFullType())) {
			this.setContextAndType(Cass.context_0_3, Framework.TYPE_0_3);
		}
		if (Framework.TYPE_0_3 == (this.getFullType())) {
			this.setContextAndType(Cass.context_0_4, Framework.TYPE_0_4);
		}
		if (Framework.TYPE_0_4 == (this.getFullType())) {
			this.setContextAndType(Cass.context_0_5, Framework.TYPE_0_5);
		}
		if (Framework.TYPE_0_5 == (this.getFullType())) {
			this.setContextAndType(Cass.context_0_6, Framework.TYPE_0_6);
		}
	}
	getTypes() {
		return [
			Framework.TYPE_0_6,
			Framework.TYPE_0_5,
			Framework.TYPE_0_4,
			Framework.TYPE_0_3,
			Framework.TYPE_0_2,
			Framework.TYPE_0_1,
		];
	}
};
