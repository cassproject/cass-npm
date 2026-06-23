const EcRepository = require("../../cassproject/ebac/repository/EcRepository.js");
const Level = require("../../cassproject/schema/cass/competency/Level.js");
const EcRemoteLinkedData = require("../../cassproject/schema/general/EcRemoteLinkedData.js");
const EcAlignment = require("./EcAlignment.js");
/**
 *  Implementation of a Level object with methods for interacting with CASS
 *  services on a server.
 *
 *  @author fritz.ray@eduworks.com
 *  @author devlin.junker@eduworks.com
 *  @module org.cassproject
 *  @class EcLevel
 *  @constructor
 *  @extends Level
 */
module.exports = class EcLevel extends Level {
	/**
	 *  Retrieves a level from the server specified by its ID
	 *
	 *  @param {String}             id
	 *                              ID of the level to retrieve
	 *  @param {Callback1<EcLevel>} success
	 *                              Callback triggered when successfully retrieving the level,
	 *                              returns the level
	 *  @param {Callback1<String>}  failure
	 *                              Callback triggered if error occurs when retrieving the level
	 *  @memberOf EcLevel
	 *  @method get
	 *  @static
	 */
	static get(id, success, failure, repo, eim) {
		return EcRepository.getAs(id, new EcLevel(), success, failure, repo, eim);
	}
	/**
	 *  Retrieves a level from it's server synchronously, the call
	 *  blocks until it is successful or an error occurs
	 *
	 *  @param {String} id
	 *                  ID of the level to retrieve
	 *  @return EcLevel
	 *  The level retrieved
	 *  @memberOf EcLevel
	 *  @method getBlocking
	 *  @static
	 *  @deprecated Use await on get()
	 */
	static getBlocking(id, repo, eim) {
		return EcRepository.getAs(id, new EcLevel(), null, null, repo, eim);
	}
	/**
	 *  Searches for levels with a string query
	 *
	 *  @param {EcRepository}              repo
	 *                                     Repository to search for levels
	 *  @param {String}                    query
	 *                                     query string to use in search
	 *  @param {Callback1<Array<EcLevel>>} success
	 *                                     Callback triggered when searches successfully
	 *  @param {Callback1<String>}         failure
	 *                                     Callback triggered if an error occurs while searching
	 *  @param {Object}                    paramObj
	 *                                     Search parameters object to pass in
	 *  @memberOf EcLevel
	 *  @method search
	 *  @static
	 */
	static search(repo, query, success, failure, paramObj, eim) {
		return EcRepository.searchAs(
			repo,
			query,
			() => new EcLevel(),
			success,
			failure,
			paramObj, eim
		);
	}
	/**
	 *  Searches for levels using a competency that the results must be related to
	 *
	 *  @param {EcRepository}              repo
	 *                                     Repository to search for levels
	 *  @param {String}                    competencyId
	 *                                     competency ID that the levels are rleated to
	 *  @param {Callback1<Array<EcLevel>>} success
	 *                                     Callback triggered when searches successfully
	 *  @param {Callback1<String>}         failure
	 *                                     Callback triggered if an error occurs while searching
	 *  @param {Object}                    paramObj
	 *                                     Search parameters object to pass in
	 *  @memberOf EcLevel
	 *  @method searchByCompetency
	 *  @static
	 */
	static searchByCompetency(repo, competencyId, success, failure, paramObj, eim) {
		if (competencyId == null || competencyId == "") {
			failure("No Competency Specified");
			return;
		}
		return EcLevel.search(repo, competencyId, success, failure, paramObj, eim);
	}
	/**
	 *  Adds a relationship between this level and a target level to define
	 *  how they correspond to one another
	 *
	 *  @param {EcLevel} targetLevel
	 *                   Target level of the relationship
	 *  @param {String}  alignmentType
	 *                   Type of relationship
	 *  @param {EcPpk}   identity
	 *                   Private key that will own the new relationship
	 *  @param {String}  server
	 *                   URL Prefix of the new relationship ID (Server it will be saved on)
	 *  @memberOf EcLevel
	 *  @method addRelationship
	 */
	async addRelationship(
		targetLevel,
		alignmentType,
		identity,
		success,
		failure,
		repo, eim
	) {
		let a = new EcAlignment();
		a.source = this.shortId();
		a.target = targetLevel.shortId();
		a.relationType = alignmentType;
		a.addOwner(identity.toPk());
		if (repo?.selectedServer != null)
			a.generateId(repo.selectedServer);
		await a.save(success, failure, repo, eim);
		return a;
	}
	/**
	 *  Method to set the name of this level
	 *
	 *  @param {String} name
	 *                  Name to set on the level
	 *  @memberOf EcLevel
	 *  @method setName
	 */
	setName(name) {
		this.name = name;
	}
	/**
	 *  Method to set the description of the level
	 *
	 *  @param {String} description
	 *                  Description to set on the level
	 *  @memberOf EcLevel
	 *  @method setDescription
	 */
	setDescription(description) {
		this.description = description;
	}
	/**
	 *  Saves this levels details to the server
	 *
	 *  @param {Callback1<String>} success
	 *                             Callback triggered on successfully saving the level to the server
	 *  @param {Callback1<String>} failure
	 *                             Callback triggered if error occurs while saving the level to the server
	 *  @memberOf EcLevel
	 *  @method save
	 */
	save(success, failure, repo, eim) {
		if (this.name == null || this.name == "") {
			let msg = "Level name cannot be empty";
			if (failure !== undefined && failure != null) return failure(msg);
			else throw new Error(msg);
		}
		if (this.competency == null || this.competency == "") {
			let msg = "Level's Competency cannot be empty";
			if (failure !== undefined && failure != null) return failure(msg);
			else throw new Error(msg);
		}
		if (repo == null) return EcRepository.save(this, success, failure, repo, eim);
		else return repo.saveTo(this, success, failure, eim);
	}
	/**
	 *  Deletes the level from it's repository
	 *
	 *  @param {Callback1<String>} success
	 *                             Callback triggered when the level is successfully deleted from the server
	 *  @param {Callback1<String>} failure
	 *                             Callback triggered if an error occurs while deleting the level
	 *  @memberOf EcLevel
	 *  @method _delete
	 */
	_delete = function (success, failure, repo, eim) {
		return EcRepository.DELETE(this, success, failure, repo, eim);
	};
};
