const Cass = require("../Cass.js");

const schema = {
	"CreativeWork": require("../../../../schema/CreativeWork.js")
};
/**
 *  A relation between two objects.
 *
 *  @author fritz.ray@eduworks.com
 *  @class Relation
 *  @module org.cassproject
 *  @extends CreativeWork
 */
module.exports = class Relation extends schema.CreativeWork {
	constructor() {
		super();
		this.setContextAndType(Cass.context, Relation.myType);
	}
	/**
	 *  Relation type when one object enables the capability to obtain another.
	 *  Enabling relations do not imply a requirement, but makes the acquisition of the source much easier.
	 *
	 *  @property IS_ENABLED_BY
	 *  @static
	 *  @type string
	 */
	static IS_ENABLED_BY = "isEnabledBy";
	/**
	 *  Relation type when one object requires another.
	 *  Requiring relations are strict.
	 *
	 *  @property REQUIRES
	 *  @static
	 *  @type string
	 */
	static REQUIRES = "requires";
	/**
	 *  Relation type when one object desires another.
	 *  Desire relations improve the range of applicability or improve performance of the source.
	 *
	 *  @property DESIRES
	 *  @static
	 *  @type string
	 */
	static DESIRES = "desires";
	/**
	 *  Relation type when one object is a subset of another.
	 *  Narrows relations are strict, and represent a super/sub relation.
	 *
	 *  @property NARROWS
	 *  @static
	 *  @type string
	 */
	static NARROWS = "narrows";
	/**
	 *  Relation type when one object is related to another.
	 *  Related relations provide linkages that do not necessarily carry information.
	 *  Related relations are bidirectional.
	 *
	 *  @property IS_RELATED_TO
	 *  @static
	 *  @type string
	 */
	static IMPLIES = "implies";
	/**
	 *  Relation type when information from one object is used in another.
	 *
	 *  @property IMPLIES
	 *  @static
	 *  @type string
	 */
	static IS_RELATED_TO = "isRelatedTo";
	/**
	 *  Relation type when one object is equivalent to another.
	 *  Equivalent relations define two objects that are effectively equivalent.
	 *  Equivalent relations are bidirectional.
	 *
	 *  @property IS_EQUIVALENT_TO
	 *  @static
	 *  @type string
	 */
	static IS_EQUIVALENT_TO = "isEquivalentTo";
	static TYPE_0_1 = "http://schema.eduworks.com/cass/0.1/relation";
	static TYPE_0_2 = "http://schema.eduworks.com/cass/0.2/relation";
	static TYPE_0_3 = "http://schema.cassproject.org/0.2/Relation";
	static TYPE_0_4 = "http://schema.cassproject.org/0.3/Relation";
	static TYPE_0_5 = "https://schema.cassproject.org/0.3/Relation";
	static TYPE_0_6 = "https://schema.cassproject.org/0.4/Relation";
	static myType = this.TYPE_0_6;
	/**
	 *  URL of the object at the beginning of the relation.
	 *  A <relation> B, this is A.
	 *
	 *  @property source
	 *  @type string(url)
	 */
	source = null;
	/**
	 *  URL of the object at the end of the relation.
	 *  A <relation> B, this is B.
	 *
	 *  @property target
	 *  @type string(url)
	 */
	target = null;
	/**
	 *  URL or controlled vocabulary of the relation.
	 *  A <relation> B, this is <relation>.
	 *
	 *  @property relationType
	 *  @type string | URL
	 */
	relationType = null;
	/**
	 *  Date time in ISO 8601 format at which the relation may be observed.
	 *
	 *  @property validFrom
	 *  @type string
	 */
	validFrom = null;
	/**
	 *  Date time in ISO 8601 format at which the relation may no longer be observed.
	 *
	 *  @property validThrough
	 *  @type string
	 */
	validThrough = null;
	upgrade() {
		super.upgrade();
		if ("isEquivalenTo" == this.relationType)
			this.relationType = Relation.IS_EQUIVALENT_TO;
		if (Relation.TYPE_0_1 == this.type) {
			let me = this;
			if (me["@context"] == null && me["@schema"] != null)
				me["@context"] = me["@schema"];
			this.setContextAndType(Cass.context_0_2, Relation.TYPE_0_2);
		}
		if (Relation.TYPE_0_2 == this.getFullType()) {
			this.setContextAndType(Cass.context_0_3, Relation.TYPE_0_3);
		}
		if (Relation.TYPE_0_3 == this.getFullType()) {
			this.setContextAndType(Cass.context_0_4, Relation.TYPE_0_4);
		}
		if (Relation.TYPE_0_4 == this.getFullType()) {
			this.setContextAndType(Cass.context_0_5, Relation.TYPE_0_5);
		}
		if (Relation.TYPE_0_5 == this.getFullType()) {
			this.setContextAndType(Cass.context_0_6, Relation.TYPE_0_6);
		}
	}
	getTypes() {
		let a = [];
		a.push(Relation.TYPE_0_6);
		a.push(Relation.TYPE_0_5);
		a.push(Relation.TYPE_0_4);
		a.push(Relation.TYPE_0_3);
		a.push(Relation.TYPE_0_2);
		a.push(Relation.TYPE_0_1);
		return a;
	}
};
