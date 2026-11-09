const EcRepository = require("../../cassproject/ebac/repository/EcRepository.js");
const Directory = require("../../cassproject/schema/cass/competency/Directory.js");
/**
 *  Implementation of a Directory object with methods for interacting with CASS
 *  services on a server.
 *
 *  @author kristin.wood@eduworks.com
 *  @module org.cassproject
 *  @class EcDirectory
 *  @constructor
 *  @extends Directory
 */
module.exports = class EcDirectory extends Directory {
	constructor() {
		super();
		if (EcDirectory.template != null) {
			let you = EcDirectory.template;
			for (let key in you) {
				if (typeof you[key] != "function")
					this[key.replace("@", "")] = you[key];
			}
		}
	}
	static template = null;
	equals(obj) {
		return this.isId(obj.id);
	}
	/**
	 *  Retrieves a directory from the server, specified by the ID
	 *
	 *  @param {String}                 id
	 *                                  ID of the directory to retrieve
	 *  @param {Callback1<EcDirectory>} success
	 *                                  Callback triggered after successfully retrieving the directory,
	 *                                  returns the retrieved directory
	 *  @param {Callback1<String>}      failure
	 *                                  Callback triggered if an error occurs while retrieving the directory
	 *  @memberOf EcDirectory
	 *  @method get
	 *  @static
	 */
	static get(id, success, failure, repo, eim) {
		return EcRepository.getAs(id, new EcDirectory(), success, failure, repo, eim);
	}
	/**
	 *  Retrieves a directory from the server in a blocking fashion, specified by the ID
	 *
	 *  @param {String}                 id
	 *                                  ID of the directory to retrieve
	 *  @param {Callback1<EcDirectory>} success
	 *                                  Callback triggered after successfully retrieving the directory,
	 *                                  returns the retrieved directory
	 *  @param {Callback1<String>}      failure
	 *                                  Callback triggered if an error occurs while retrieving the directory
	 *  @memberOf EcDirectory
	 *  @method getBlocking
	 *  @static
	 *  @deprecated Use await on get().
	 */
	static getBlocking(id, repo, eim) {
		return EcRepository.getAs(id, new EcDirectory(), null, null, repo, eim);
	}
	/**
	 *  Searches the repository given for directories using the query passed in
	 *
	 *  @param {EcRepository}                 repo
	 *                                        Repository to search for directories
	 *  @param {String}                       query
	 *                                        Query string used to search for a directory
	 *  @param {Callback1<Array<EcDirectory>} success
	 *                                        Callback triggered when the search successfully returns,
	 *                                        returns search results
	 *  @param {Callback1<String>}            failure
	 *                                        Callback triggered if an error occurs while searching
	 *  @param {Object}                       paramObj
	 *                                        Parameter object for search
	 *  @memberOf EcDirectory
	 *  @method search
	 *  @static
	 */
	static search(repo, query, success, failure, paramObj, eim) {
		return EcRepository.searchAs(
			repo,
			query,
			() => new EcDirectory(),
			success,
			failure,
			paramObj, eim
		);
	}
	/**
	 *  Saves this directory's details on the server specified by its ID or repo
	 *
	 *  @param {Callback1<String>} success
	 *                             Callback triggered after successfully saving the directory
	 *  @param {Callback1<String>} failure
	 *                             Callback triggered if error occurs while saving the directory
	 *  @param {EcRepository}      repo
	 *                             Repository to save the item to
	 *  @memberOf EcDirectory
	 *  @method save
	 */
	save(success, failure, repo, eim) {
		if (this.name == null || this.name == "") {
			let msg = "Directory Name Cannot be Empty";
			if (failure !== undefined && failure != null) return failure(msg);
			else throw new Error(msg);
		}
		if (repo == null) return EcRepository.save(this, success, failure, repo, eim);
		else return repo.saveTo(this, success, failure, eim);
	}
	/**
	 *  Deletes this directory from the server specified by its ID
	 *
	 *  @param {Callback1<String>} success
	 *                             Callback triggered if successfully deleted directory
	 *  @param {Callback1<String>} failure
	 *                             Callback triggered if error occurs when deleting the directory
	 *  @memberOf EcDirectory
	 *  @method _delete
	 */
	_delete = function (success, failure, repo, eim) {
		return EcRepository.DELETE(this, success, failure, repo, eim);
	};
};
