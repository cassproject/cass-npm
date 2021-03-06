/**
 * Schema.org/Distance
 * Properties that take Distances as values are of the form '&lt;Number&gt; &lt;Length unit of measure&gt;'. E.g., '7 ft'.
 *
 * @author schema.org
 * @class Distance
 * @module org.schema
 */
module.exports = class Distance extends EcRemoteLinkedData {
	/**
	 * Constructor, automatically sets @context and @type.
	 *
	 * @constructor
	 */
	constructor() {
		super();
		this.setContextAndType("http://schema.org/", "Distance");
	}
};
