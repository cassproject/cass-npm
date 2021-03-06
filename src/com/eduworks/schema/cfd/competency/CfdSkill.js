/**
 *  Competency is Under construction.
 *  <p>
 *  Working model of competency with Skill CFD extension.
 *
 *  @author debbie.brown@eduworks.com
 *  @author devlin.junker@eduworks.com
 *  @class Skill
 *  @module com.eduworks
 *  @extends org.cassproject.schema.cass.competency.Competency
 */
module.exports = class CfdSkill extends CfdCompetency {
	/**
	 *  Sub-type of Competency that this is (Will be replaced later)
	 *
	 *  @property subtype
	 *  @type string
	 */
	subtype = "Skill";
};
