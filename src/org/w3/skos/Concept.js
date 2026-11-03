/**
 *  www.w3.org/2004/02/skos/core/Concept
 *  An idea or notion; a unit of thought.
 *  @author w3.org
 *  @class Concept
 *  @module org.w3.skos
 */
module.exports = class Concept extends EcRemoteLinkedData {
	/**
	 *  Constructor, automatically sets @context and @type.
	 *  @constructor
	 */
	constructor() {
		super("https://schema.cassproject.org/0.4/skos/", "Concept");
	}

	static TYPE_0_1 = "http://schema.cassproject.org/0.3/skos/Concept"; // NOSONAR - JSON-LD identifier, never fetched
	static TYPE_0_2 = "https://schema.cassproject.org/0.3/skos/Concept";
	static TYPE_0_3 = "https://schema.cassproject.org/0.4/skos/Concept";
	static myType = this.TYPE_0_3;
	/**
	 *  www.w3.org/2004/02/skos/core/topConceptOf
	 *  Relates a concept to the concept scheme that it is a top level concept of.
	 *  @property topConceptOf
	 *  @type ConceptScheme
	 */
	topConceptOf = null;
	/**
	 *  www.w3.org/2004/02/skos/core/semanticRelation
	 *  Links a concept to a concept related by meaning.
	 *  @property semanticRelation
	 *  @type Concept
	 */
	semanticRelation = null;
	upgrade() {
		super.upgrade();
		if (Concept.TYPE_0_1 == (this.getFullType())) {
			this.setContextAndType(
				"https://schema.cassproject.org/0.3/skos",
				Concept.TYPE_0_2
			);
		}
		if (Concept.TYPE_0_2 == (this.getFullType())) {
			this.setContextAndType(
				"https://schema.cassproject.org/0.4/skos",
				Concept.TYPE_0_3
			);
		}
	}
	getTypes() {
		let a = [];
		a.push(Concept.TYPE_0_3);
		a.push(Concept.TYPE_0_2);
		a.push(Concept.TYPE_0_1);
		return a;
	}
};
