/**
 *  www.w3.org/2004/02/skos/core/ConceptScheme
 *  A set of concepts, optionally including statements about semantic relationships between those concepts.
 *  A concept scheme may be defined to include concepts from different sources.
 *  @author w3.org
 *  @class ConceptScheme
 *  @module org.w3.skos
 */
module.exports = class ConceptScheme extends EcRemoteLinkedData {
	/**
	 *  Constructor, automatically sets @context and @type.
	 *  @constructor
	 */
	constructor() {
		super("https://schema.cassproject.org/0.4/skos/", "ConceptScheme");
	}
	static TYPE_0_1 = "http://schema.cassproject.org/0.3/skos/ConceptScheme"; // NOSONAR - JSON-LD identifier, never fetched
	static TYPE_0_2 = "https://schema.cassproject.org/0.3/skos/ConceptScheme";
	static TYPE_0_3 = "https://schema.cassproject.org/0.4/skos/ConceptScheme";
	static myType = this.TYPE_0_3;
	/**
	 *  www.w3.org/2004/02/skos/core/hasTopConcept
	 *  Relates, by convention, a concept scheme to a concept which is topmost in the broader/narrower concept hierarchies for that scheme, providing an entry point to these hierarchies.
	 *  @property hasTopConcept
	 *  @type Concept
	 */
	hasTopConcept = null;
	upgrade() {
		super.upgrade();
		if (ConceptScheme.TYPE_0_1 == (this.getFullType())) {
			this.setContextAndType(
				"https://schema.cassproject.org/0.3/skos",
				ConceptScheme.TYPE_0_2
			);
		}
		if (ConceptScheme.TYPE_0_2 == (this.getFullType())) {
			this.setContextAndType(
				"https://schema.cassproject.org/0.4/skos",
				ConceptScheme.TYPE_0_3
			);
		}
	}
	getTypes() {
		return [
			ConceptScheme.TYPE_0_3,
			ConceptScheme.TYPE_0_2,
			ConceptScheme.TYPE_0_1,
		];
	}
};
