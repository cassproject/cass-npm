/**
 * Schema.org/EducationalOccupationalProgram
 * A program offered by an institution which determines the learning progress to achieve an outcome, usually a credential like a degree or certificate. This would define a discrete set of opportunities (e.g., job, courses) that together constitute a program with a clear start, end, set of requirements, and transition to a new occupational opportunity (e.g., a job), or sometimes a higher educational opportunity (e.g., an advanced degree).
 *
 * @author schema.org
 * @class EducationalOccupationalProgram
 * @module org.schema
 */
module.exports = class EducationalOccupationalProgram extends
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
			"EducationalOccupationalProgram"
		);
	}
};
