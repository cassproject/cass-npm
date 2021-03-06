/**
 * Schema.org/OccupationalExperienceRequirements
 * Indicates employment-related experience requirements, e.g. [[monthsOfExperience]].
 *
 * @author schema.org
 * @class OccupationalExperienceRequirements
 * @module org.schema
 */
module.exports = class OccupationalExperienceRequirements extends
	EcRemoteLinkedData {
	/**
	 * Constructor, automatically sets @context and @type.
	 *
	 * @constructor
	 */
	constructor() {
		super();
		this.setContextAndType(
			"http://schema.org/",
			"OccupationalExperienceRequirements"
		);
	}
};
