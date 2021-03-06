/**
 * Schema.org/MedicalTrialDesign
 * Design models for medical trials. Enumerated type.
 *
 * @author schema.org
 * @class MedicalTrialDesign
 * @module org.schema
 */
module.exports = class MedicalTrialDesign extends EcRemoteLinkedData {
	/**
	 * Constructor, automatically sets @context and @type.
	 *
	 * @constructor
	 */
	constructor() {
		super();
		this.setContextAndType("http://schema.org/", "MedicalTrialDesign");
	}
};
