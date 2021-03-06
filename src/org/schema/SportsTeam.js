/**
 * Schema.org/SportsTeam
 * Organization: Sports team.
 *
 * @author schema.org
 * @class SportsTeam
 * @module org.schema
 */
module.exports = class SportsTeam extends EcRemoteLinkedData {
	/**
	 * Constructor, automatically sets @context and @type.
	 *
	 * @constructor
	 */
	constructor() {
		super();
		this.setContextAndType("http://schema.org/", "SportsTeam");
	}
};
