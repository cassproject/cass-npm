/**
 *  Competency is Under construction.
 *  <p>
 *  Working model of competency with CFD Rollup extension.
 *
 *  @author debbie.brown@eduworks.com
 *  @author devlin.junker@eduworks.com
 *  @class Rollup
 *  @module com.eduworks
 *  @extends org.cassproject.schema.cass.competency.Competency
 */
module.exports = class CfdRollup extends CfdCompetency {
	/**
	 *  Sub-type of Competency that this is (Will be replaced later)
	 *
	 *  @property subtype
	 *  @type string
	 */
	subtype = "Rollup";
};
