/**
 * Schema.org/GameServer
 * Server that provides game interaction in a multiplayer game.
 *
 * @author schema.org
 * @class GameServer
 * @module org.schema
 */
module.exports = class GameServer extends EcRemoteLinkedData {
	/**
	 * Constructor, automatically sets @context and @type.
	 *
	 * @constructor
	 */
	constructor() {
		super();
		this.setContextAndType("http://schema.org/", "GameServer");
	}
};
