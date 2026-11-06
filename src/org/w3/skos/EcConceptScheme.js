const EcRepository = require("../../cassproject/ebac/repository/EcRepository");

/**
 *  Created by fray on 11/29/17.
 */
module.exports = class EcConceptScheme extends ConceptScheme {
	constructor() {
		super();
		if (EcConceptScheme.template != null) {
			let you = EcConceptScheme.template;
			for (let key in you) {
				if (typeof you[key] != "function")
					this[key.replace("@", "")] = you[key];
			}
		}
	}
	static template = null;
	/**
	 *  Retrieves a concept scheme from the server, specified by the ID
	 *
	 *  @param {String}                 id
	 *                                  ID of the concept scheme to retrieve
	 *  @param {Callback1<EcConceptScheme>} success
	 *                                  Callback triggered after successfully retrieving the concept scheme,
	 *                                  returns the retrieved concept scheme
	 *  @param {Callback1<String>}      failure
	 *                                  Callback triggered if an error occurs while retrieving the concept scheme
	 *  @memberOf EcConceptScheme
	 *  @method get
	 *  @static
	 */
	static get(id, success, failure, repo, eim) {
		return EcRepository.getAs(id, new EcConceptScheme(), success, failure, repo, eim);
	}
	/**
	 *  Retrieves a concept scheme from the server in a blocking fashion, specified by the ID
	 *
	 *  @param {String}                 id
	 *                                  ID of the concept scheme to retrieve
	 *  @param {Callback1<EcConceptScheme>} success
	 *                                  Callback triggered after successfully retrieving the concept scheme,
	 *                                  returns the retrieved concept scheme
	 *  @param {Callback1<String>}      failure
	 *                                  Callback triggered if an error occurs while retrieving the concept scheme
	 *  @memberOf EcConceptScheme
	 *  @method getBlocking
	 *  @static
	 */
	static getBlocking(id, repo, eim) {
		return EcRepository.getAs(id, new EcConceptScheme(), null, null, repo, eim);
	}
	/**
	 *  Searches the repository given for concept schemes using the query passed in
	 *
	 *  @param {EcRepository}                 repo
	 *                                        Repository to search for concept schemes
	 *  @param {String}                       query
	 *                                        Query string used to search for a concept scheme
	 *  @param {Callback1<Array<EcConceptScheme>} success
	 *                                        Callback triggered when the search successfully returns,
	 *                                        returns search results
	 *  @param {Callback1<String>}            failure
	 *                                        Callback triggered if an error occurs while searching
	 *  @param {Object}                       paramObj
	 *                                        Parameter object for search
	 *  @memberOf EcConceptScheme
	 *  @method search
	 *  @static
	 */
	static search(repo, query, success, failure, paramObj, eim) {
		return EcRepository.searchAs(
			repo,
			query,
			() => new EcConceptScheme(),
			success,
			failure,
			paramObj, eim
		);
	}
};
