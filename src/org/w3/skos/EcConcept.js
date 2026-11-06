const EcRepository = require("../../cassproject/ebac/repository/EcRepository");

/**
 *  Created by fray on 11/29/17.
 */
module.exports = class EcConcept extends Concept {
	constructor() {
		super();
		if (EcConcept.template != null) {
			let you = EcConcept.template;
			for (let key in you) {
				if (typeof you[key] != "function")
					this[key.replace("@", "")] = you[key];
			}
		}
	}
	static template = null;
	/**
	 *  Retrieves a concept from it's server asynchronously
	 *
	 *  @param {String}            id
	 *                             ID of the concept to retrieve from the server
	 *  @param {Callback1<String>} success
	 *                             Callback triggered after retrieving the concept,
	 *                             returns the concept retrieved
	 *  @param {Callback1<String>} failure
	 *                             Callback triggered if error retrieving concept
	 *  @memberOf EcConcept
	 *  @method get
	 *  @static
	 */
	static get(id, success, failure, repo, eim) {
		return EcRepository.getAs(id, new EcConcept(), success, failure, repo, eim);
	}
	/**
	 *  Retrieves a concept from it's server synchronously, the call
	 *  blocks until it is successful or an error occurs
	 *
	 *  @param {String} id
	 *                  ID of the concept to retrieve
	 *  @return EcConcept
	 *  The concept retrieved
	 *  @memberOf EcConcept
	 *  @method getBlocking
	 *  @static
	 */
	static getBlocking(id, repo, eim) {
		return EcRepository.getAs(id, new EcConcept(), null, null, repo, eim);
	}
	/**
	 *  Searches a repository for competencies that match the search query
	 *
	 *  @param {EcRepository}                  repo
	 *                                         Repository to search using the query
	 *  @param {String}                        query
	 *                                         Query string to pass to the search web service
	 *  @param {Callback1<Array<EcConcept>> success
	 *                                         Callback triggered after completing the search, returns the results
	 *  @param {Callback1<String>}             failure
	 *                                         Callback triggered if error searching
	 *  @param {Object}                        paramObj
	 *                                         Parameter object for search
	 *  @memberOf EcConcept
	 *  @method search
	 *  @static
	 */
	static search(repo, query, success, failure, paramObj, eim) {
		return EcRepository.searchAs(
			repo,
			query,
			() => new EcConcept(),
			success,
			failure,
			paramObj, eim
		);
	}
};
