const EcRepository = require("../../cassproject/ebac/repository/EcRepository.js");
const Competency = require("../../cassproject/schema/cass/competency/Competency.js");
const EcAlignment = require("./EcAlignment.js");
const EcLevel = require("./EcLevel.js");
const EcRollupRule = require("./EcRollupRule.js");
require("../../cassproject/general/AuditLogger.js");
/**
 *  Implementation of a Competency object with methods for interacting with CASS
 *  services on a server.
 *
 *  @author fritz.ray@eduworks.com
 *  @author devlin.junker@eduworks.com
 *  @module org.cassproject
 *  @class EcCompetency
 *  @constructor
 *  @extends Competency
 */
module.exports = class EcCompetency extends Competency {
	constructor() {
		super();
		if (EcCompetency.template != null) {
			let you = EcCompetency.template;
			for (let key in you) {
				if (typeof you[key] != "function")
					this[key.replace("@", "")] = you[key];
			}
		}
	}
	static relDone = {};
	static levelDone = {};
	static template = null;
	equals(obj) {
		return this.isId(obj.id);
	}
	/**
	 *  Retrieves a competency from it's server asynchronously
	 *
	 *  @param {String}            id
	 *                             ID of the competency to retrieve from the server
	 *  @param {Callback1<String>} success
	 *                             Callback triggered after retrieving the competency,
	 *                             returns the competency retrieved
	 *  @param {Callback1<String>} failure
	 *                             Callback triggered if error retrieving competency
	 *  @memberOf EcCompetency
	 *  @method get
	 *  @static
	 */
	static get(id, success, failure, repo, eim) {
		return EcRepository.getAs(id, new EcCompetency(), success, failure, repo, eim);
	}
	/**
	 *  Retrieves a competency from it's server synchronously, the call
	 *  blocks until it is successful or an error occurs
	 *
	 *  @param {String} id
	 *                  ID of the competency to retrieve
	 *  @return EcCompetency
	 *  The competency retrieved
	 *  @memberOf EcCompetency
	 *  @method getBlocking
	 *  @static
	 *  @deprecated await on get() instead.
	 */
	static getBlocking(id, repo, eim) {
		return EcRepository.getAs(id, new EcCompetency(), null, null, repo, eim);
	}
	/**
	 *  Searches a repository for competencies that match the search query
	 *
	 *  @param {EcRepository}                  repo
	 *                                         Repository to search using the query
	 *  @param {String}                        query
	 *                                         Query string to pass to the search web service
	 *  @param {Callback1<Array<EcCompetency>> success
	 *                                         Callback triggered after completing the search, returns the results
	 *  @param {Callback1<String>}             failure
	 *                                         Callback triggered if error searching
	 *  @param {Object}                        paramObj
	 *                                         Parameter object for search
	 *  @memberOf EcCompetency
	 *  @method search
	 *  @static
	 */
	static search(repo, query, success, failure, paramObj, eim) {
		return EcRepository.searchAs(
			repo,
			query,
			() => new EcCompetency(),
			success,
			failure,
			paramObj, eim
		);
	}
	/**
	 *  Adds a new alignment on the server specified with this competency as its
	 *  source and the specified target competency
	 *
	 *  @param {EcCompetency}      target
	 *                             Competency to be related with
	 *  @param {String}            alignmentType
	 *                             String defining the relationship type
	 *  @param {EcPpk}             owner
	 *                             Private Key that will own the relationship created
	 *  @param {String}            server
	 *                             URL Prefix of the new relationship (Server it will be saved on)
	 *  @param {Callback1<String>} success
	 *                             Callback triggered after successfully creating and saving the relationship
	 *  @param {Callback1<String>} [failure]
	 *                             Callback triggered if error creating and saving relationship
	 *  @return EcAlignment
	 *  Created relationship
	 *  @memberOf EcCompetency
	 *  @method addAlignment
	 */
	async addAlignment(
		target,
		alignmentType,
		owner,
		success,
		failure,
		repo,
		eim
	) {
		let a = new EcAlignment();
		if (repo != null)
			a.generateId(repo.selectedServer);
		a.source = this.shortId();
		a.target = target.shortId();
		a.relationType = alignmentType;
		a.addOwner(owner.toPk());
		await a.save(success, failure, repo, eim);
		return a;
	}
	/**
	 *  Searches the repository given for any relationships that contain this competency
	 *
	 *  @param {EcRepository}                  repo
	 *                                         Repository to search for relationships
	 *  @param {Callback1<EcAlignment>}        eachSuccess
	 *                                         Callback triggered for each relationship found
	 *  @param {Callback1<String>}             failure
	 *                                         Callback triggered if an error finding relationships
	 *  @param {Callback1<Array<EcAlignment>>} successAll
	 *                                         Callback triggered once all of the relationships have been found
	 *  @memberOf EcCompetency
	 *  @method relations
	 */
	relations(repo, eachSuccess, failure, successAll) {
		return this.relationships(repo, eachSuccess, failure, successAll); //NOSONAR - Renamed function is intentional
	}
	/**
	 *  Searches the repository given for any relationships that contain this competency
	 *
	 *  @param {EcRepository}                  repo
	 *                                         Repository to search for relationships
	 *  @param {Callback1<EcAlignment>}        eachSuccess
	 *                                         Callback triggered for each relationship found
	 *  @param {Callback1<String>}             failure
	 *                                         Callback triggered if an error finding relationships
	 *  @param {Callback1<Array<EcAlignment>>} successAll
	 *                                         Callback triggered once all of the relationships have been found
	 *  @memberOf EcCompetency
	 *  @method relations
	 *  @deprecated
	 */
	relationships(repo, eachSuccess, failure, successAll, eim) {
		return EcAlignment.search(
			repo,
			'source:"' +
			this.id +
			'" OR target:"' +
			this.id +
			'" OR source:"' +
			this.shortId() +
			'" OR target:"' +
			this.shortId() +
			'"',
			async (results) => {
				if (eachSuccess !== undefined && eachSuccess != null)
					for (let result of results)
						await eachSuccess(result);
				if (successAll !== undefined && successAll != null)
					await successAll(results);
				return results;
			},
			failure,
			{}, eim
		);
	}
	/**
	 *  Adds a new level on the server specified for this competency.
	 *
	 *  @param {String}            name
	 *                             Name of the new level to create
	 *  @param {String}            description
	 *                             Description of the new level to create
	 *  @param {String}            owner
	 *                             Private key of the owner of the new level
	 *  @param {String}            server
	 *                             URL Prefix for the new level's ID (Server saved on)
	 *  @param {Callback1<String>} success
	 *                             Callback triggered after successfully creating and saving the level
	 *  @param {Callback1<String>} failure
	 *                             Callback triggered if an error creating and saving the level
	 *  @return EcLevel
	 *  Level created
	 *  @memberOf EcCompetency
	 *  @method addLevel
	 */
	async addLevel(
		name,
		description,
		owner,
		success,
		failure,
		repo,
		eim
	) {
		let l = new EcLevel();
		if (repo == null) throw new Error("Repo must not be null.");
		l.generateId(repo.selectedServer);
		l.competency = this.shortId();
		l.description = description;
		l.name = name;
		l.addOwner(owner.toPk());
		await l.save(success, failure, repo, eim);
		return l;
	}
	/**
	 *  Searches the repository given for any levels of this competency
	 *
	 *  @param {EcRepository}              repo
	 *                                     Repository to search for levels
	 *  @param {Callback1<EcLevel>}        success
	 *                                     Callback triggered for each level found
	 *  @param {Callback1<String>}         failure
	 *                                     Callback triggered if an error finding levels
	 *  @param {Callback1<Array<EcLevel>>} successAll
	 *                                     Callback triggered once all of the levels have been found
	 *  @memberOf EcCompetency
	 *  @method levels
	 */
	levels(repo, eachSuccess, failure, successAll, eim) {
		let query =
			'competency:"' +
			this.id +
			'" OR competency:"' +
			this.shortId() +
			'"';
		return EcLevel.search(
			repo,
			query,
			async (results) => {
				if (eachSuccess != null)
					for (let result of results)
						await eachSuccess(result);
				if (successAll != null)
					await successAll(results);
				return results;
			},
			failure,
			{}, eim
		);
	}
	/**
	 *  Adds a new rollup rule on the server specified for this competency
	 *
	 *  @param {String}            name
	 *                             Name of the rollup rule to create
	 *  @param {String}            description
	 *                             Description of the rollup rule to create
	 *  @param {EcPpk}             owner
	 *                             Private key that will own the new rollup rule
	 *  @param {String}            server
	 *                             URL Prefix for the new rollup rule's ID (Server that it will be saved on)
	 *  @param {Callback1<String>} success
	 *                             Callback triggered if successfully save the rollup rule
	 *  @param {Callback1<String>} failure
	 *                             Callback triggered fi error during save of rollup rule
	 *  @return EcRollupRule
	 *  Created rollup rule
	 *  @memberOf EcCompetency
	 *  @method addRollupRule
	 */
	async addRollupRule(
		name,
		description,
		owner,
		success,
		failure,
		repo, eim
	) {
		let r = new EcRollupRule();
		if (repo == null)
			throw new Error("Repo is required.");
		r.generateId(repo.selectedServer);
		r.competency = this.shortId();
		r.description = description;
		r.name = name;
		r.addOwner(owner.toPk());
		await r.save(success, failure, repo, eim);
		return r;
	}
	/**
	 *  Searches the repository given for any rollup rules of this competency
	 *
	 *  @param {EcRepository}                  repo
	 *                                         Repository to search for levels
	 *  @param {Callback1<EcRollupRule>}       success
	 *                                         Callback triggered for each rollup rule found
	 *  @param {Callback1<String>}             failure
	 *                                         Callback triggered if an error finding rollup rule
	 *  @param {Callback1<Array<EcRollupRule>} successAll
	 *                                         Callback triggered once all of the rollup rules have been found
	 *  @memberOf EcCompetency
	 *  @method rollupRules
	 */
	rollupRules(repo, eachSuccess, failure, successAll, eim) {
		let query =
			'competency:"' +
			this.id +
			'" OR competency:"' +
			this.shortId() +
			'"';
		return EcRollupRule.search(
			repo,
			query,
			async (results) => {
				if (eachSuccess != null)
					for (let result of results)
						await eachSuccess(result);
				if (successAll != null)
					await successAll(results);
			},
			failure,
			{}, eim
		);
	}
	/**
	 *  Method to set competency scope
	 *
	 *  @param {String} scope
	 *                  Scope to set for its competency
	 *  @memberOf EcCompetency
	 *  @method setScope
	 */
	setScope(scope) {
		this.scope = scope;
	}
	/**
	 *  Saves the competency details to the server
	 *
	 *  @param {Callback1<String>} success
	 *                             Callback triggered on successfully saving the competency
	 *  @param {Callback1<String>} failure
	 *                             Callback triggered if error saving competency
	 *  @memberOf EcCompetency
	 *  @method save
	 */
	save(success, failure, repo, eim) {
		if (this.name == null || this.name == "") {
			let msg = "Competency Name can not be empty";
			if (failure !== undefined && failure != null) return failure(msg);
			else throw new Error(msg);
		}
		if (repo == null) return EcRepository.save(this, success, failure, repo, eim);
		else return repo.saveTo(this, success, failure, eim);
	}
	/**
	 *  Deletes the competency from the server
	 *
	 *  @param {Callback1<String>} success
	 *                             Callback triggered on successful deleting the competency
	 *  @param {Callback1<String>} failure
	 *                             Callback triggered if error deleting the competency
	 *  @param {EcRepository}      repo
	 *                             Repository to delete from and to check for levels or relationships to delete
	 *  @memberOf EcCompetency
	 *  @method _delete
	 */
	async _delete(success, failure, repo, eim) {
		if (repo != null) global.auditLogger.report(global.auditLogger.LogCategory.SYSTEM, global.auditLogger.Severity.INFO, "EcCompDelete", await this.relations(repo));
		if (repo != null) {
			global.auditLogger.report(global.auditLogger.LogCategory.SYSTEM, global.auditLogger.Severity.INFO, "EcCompDelete", JSON.stringify(await this.relations(repo)));
			(await this.relations(repo)).forEach(
				async (relation) => await EcRepository.DELETE(relation, null, null, repo, eim)
			);
		}
		if (repo != null) {
			global.auditLogger.report(global.auditLogger.LogCategory.SYSTEM, global.auditLogger.Severity.INFO, "EcCompDelete", JSON.stringify(await this.levels(repo)));
			(await this.levels(repo)).forEach(
				async (level) => await EcRepository.DELETE(level, null, null, repo, eim)
			);
		}
		await EcRepository.DELETE(this, success, failure, repo, eim);
	}
};
