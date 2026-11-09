const EcRepository = require("../../../../../org/cassproject/ebac/repository/EcRepository");

module.exports = class CfdFramework extends EcFramework {
	static toRemove = null;
	static removed = null;
	/**
	 *  Retrieves a framework from the server, specified by the ID
	 *
	 *  @param {String}                 id
	 *                                  ID of the framework to retrieve
	 *  @param {Callback1<EcFramework>} success
	 *                                  Callback triggered after successfully retrieving the framework,
	 *                                  returns the retrieved framework
	 *  @param {Callback1<String>}      failure
	 *                                  Callback triggered if an error occurs while retrieving the framework
	 *  @memberOf CfdFramework
	 *  @method get
	 *  @static
	 */
	static cfdGet(id, success, failure, repo, eim) {
		return EcRepository.getAs(id, new CfdFramework(), success, failure, repo, eim);
	}
	/**
	 *  Retrieves a framework from the server in a blocking fashion, specified by the ID
	 *
	 *  @param {String}                 id
	 *                                  ID of the framework to retrieve
	 *  @param {Callback1<EcFramework>} success
	 *                                  Callback triggered after successfully retrieving the framework,
	 *                                  returns the retrieved framework
	 *  @param {Callback1<String>}      failure
	 *                                  Callback triggered if an error occurs while retrieving the framework
	 *  @memberOf CfdFramework
	 *  @method getBlocking
	 *  @static
	 */
	static cfdGetBlocking(id, repo, eim) {
		return EcRepository.getAs(id, new CfdFramework(), null, null, repo, eim);
	}
	/**
	 *  Searches the repository given for frameworks using the query passed in
	 *
	 *  @param {EcRepository}                 repo
	 *                                        Repository to search for frameworks
	 *  @param {String}                       query
	 *                                        Query string used to search for a framework
	 *  @param {Callback1<Array<EcFramework>} success
	 *                                        Callback triggered when the search successfully returns,
	 *                                        returns search results
	 *  @param {Callback1<String>}            failure
	 *                                        Callback triggered if an error occurs while searching
	 *  @param {Object}                       paramObj
	 *                                        Parameter object for search
	 *  @param size
	 *  @param start
	 *  @memberOf CfdFramework
	 *  @method search
	 *  @static
	 */
	static cfdSearch(repo, query, success, failure, paramObj, eim) {
		return EcRepository.searchAs(
			repo,
			query,
			() => new CfdFramework(),
			success,
			failure,
			paramObj, eim
		);
	}
	/**
	 *  Deletes this framework from the server specified by it's ID
	 *
	 *  @param {Callback1<String>} success
	 *                             Callback triggered if successfully deleted framework
	 *  @param {Callback1<String>} failure
	 *                             Callback triggered if error occurs when deleting the framework
	 *  @memberOf CfdFramework
	 *  @method _delete
	 *  FR: DID NOT PORT TO 5.x.x
	 */
	_delete = function (success, failure, repo, eim) {
		if (CfdFramework.toRemove == null) CfdFramework.toRemove = {};
		let remove = 0;
		remove += this.competency == null ? 0 : this.competency.length;
		remove += this.relation == null ? 0 : this.relation.length;
		CfdFramework.toRemove[this.shortId()] = remove;
		if (CfdFramework.removed == null) CfdFramework.removed = {};
		CfdFramework.removed[this.shortId()] = 0;
		let onAllRemove = () => {
			EcRepository.DELETE(this, success, failure, repo, eim);
		};
		if (remove == 0) onAllRemove();
		if (this.competency != null && this.competency.length > 0) {
			for (let comp of this.competency) {
				CfdCompetency.get(
					comp,
					(comp) => {
						comp._delete(
							(p1) => {
								CfdFramework.removed[this.shortId()] =
									CfdFramework.removed[this.shortId()] + 1;
								if (
									CfdFramework.removed[this.shortId()] ==
									CfdFramework.toRemove[this.shortId()]
								)
									onAllRemove();
							},
							(err) => {
								let error =
									"Error deleting competency (" +
									comp.id +
									"): " +
									err;
								failure(error);
								CfdFramework.removed[this.shortId()] =
									CfdFramework.removed[this.shortId()] + 1;
								if (
									CfdFramework.removed[this.shortId()] ==
									CfdFramework.toRemove[this.shortId()]
								)
									onAllRemove();
							},
							repo, eim
						);
					},
					(err) => {
						let error =
							"Error retrieving competency to delete: " + err;
						failure(error);
						CfdFramework.removed[this.shortId()] =
							CfdFramework.removed[this.shortId()] + 1;
						if (
							CfdFramework.removed[this.shortId()] ==
							CfdFramework.toRemove[this.shortId()]
						)
							onAllRemove();
					}, repo, eim
				);
			}
		}
		if (this.relation != null && this.relation.length > 0) {
			for (let rel of this.relation) {
				EcAlignment.get(
					rel,
					(rel) => {
						rel._delete(
							(p1) => {
								CfdFramework.removed[this.shortId()] =
									CfdFramework.removed[this.shortId()] + 1;
								if (
									CfdFramework.removed[this.shortId()] ==
									CfdFramework.toRemove[this.shortId()]
								)
									onAllRemove();
							},
							(err) => {
								let error =
									"Error deleting relation (" +
									rel.id +
									"): " +
									err;
								failure(error);
								CfdFramework.removed[this.shortId()] =
									CfdFramework.removed[this.shortId()] + 1;
								if (
									CfdFramework.removed[this.shortId()] ==
									CfdFramework.toRemove[this.shortId()]
								)
									onAllRemove();
							}, repo, eim
						);
					},
					(err) => {
						let error =
							"Error retrieving relationship to delete: " + err;
						failure(error);
						CfdFramework.removed[this.shortId()] =
							CfdFramework.removed[this.shortId()] + 1;
						if (
							CfdFramework.removed[this.shortId()] ==
							CfdFramework.toRemove[this.shortId()]
						)
							onAllRemove();
					}
					, repo, eim);
			}
		}
		if (
			CfdFramework.removed[this.shortId()] ==
			CfdFramework.toRemove[this.shortId()]
		)
			onAllRemove();
	};
};
