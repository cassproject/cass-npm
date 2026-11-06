const EcRemoteLinkedData = require("../../cassproject/schema/general/EcRemoteLinkedData");
/**
 *  Import methods to handle an ASN JSON file containing a framework,
 *  competencies and relationships, and store them in a CASS instance
 *
 *  @author devlin.junker@eduworks.com
 *  @author fritz.ray@eduworks.com
 *  @module org.cassproject
 *  @class ASNImport
 *  @static
 *  @extends Importer
 */
module.exports = class ASNImport extends Importer {
	static INCREMENTAL_STEP = 5;
	static jsonFramework = null;
	static frameworkUrl = null;
	static jsonCompetencies = null;
	static competencyCount = 0;
	static relationCount = 0;
	static importedFramework = null;
	static competencies = null;
	static progressObject = null;
	static savedCompetencies = 0;
	static savedRelations = 0;
	/**
	 *  Recursive function that looks through the file and saves each
	 *  competency object in a map for use during importing. It also counts
	 *  the number of competencies and relationships that it finds
	 *
	 *  @param {Object} obj
	 *                  The current JSON object we're examining for comepetencies and reationships
	 *  @param {String} key
	 *                  The ASN identifier of the current object
	 *  @memberOf ASNImport
	 *  @method asnJsonPrime
	 *  @private
	 *  @static
	 */
	static asnJsonPrime(obj, key) {
		let value = obj[key];
		if (Importer.isObject(value)) {
			if (
				value["http://www.w3.org/1999/02/22-rdf-syntax-ns#type"] != null
			) {
				let stringVal =
					value["http://www.w3.org/1999/02/22-rdf-syntax-ns#type"][
						"0"
					]["value"];
				if (stringVal == "http://purl.org/ASN/schema/core/Statement") {
					ASNImport.jsonCompetencies[key] = value;
					ASNImport.competencyCount++;
					let children =
						value["http://purl.org/gem/qualifiers/hasChild"];
					if (children != null)
						for (let child of children) {
							ASNImport.relationCount++;
							ASNImport.asnJsonPrime(obj, EcRemoteLinkedData.trimVersionFromUrl(child["value"]));
						}
				}
			}
		}
	}
	/**
	 *  Does the actual legwork of looking for competencies and relationships.
	 *  <p>
	 *  This function finds the framework information, and pulls out the competency
	 *  objects array to be scanned by asnJsonPrime
	 *
	 *  @param {Object} obj
	 *                  ASN JSON Object from file that contains framework information and competencies/relationships
	 *  @memberOf ASNImport
	 *  @method lookThroughSource
	 *  @private
	 *  @static
	 */
	static lookThroughSource(obj) {
		ASNImport.competencyCount = 0;
		ASNImport.relationCount = 0;
		for (let key in obj) {
			let value = obj[key];
			if (!Importer.isObject(value)) 
				continue;
			if (value["http://www.w3.org/1999/02/22-rdf-syntax-ns#type"] == null) 
				continue;
			if (value["http://www.w3.org/1999/02/22-rdf-syntax-ns#type"]["0"]["value"] != "http://purl.org/ASN/schema/core/StandardDocument") 
				continue;
			ASNImport.jsonFramework = value;
			ASNImport.frameworkUrl = key;
			let children = value["http://purl.org/gem/qualifiers/hasChild"];
			if (children != null)
				for (let child of children) {
					ASNImport.asnJsonPrime(obj,EcRemoteLinkedData.trimVersionFromUrl(child["value"]));
				}
		}
	}
	/**
	 *  Analyzes an ASN File for competencies and relationships.
	 *  <p>
	 *  This should be called before import, the success callback returns an object
	 *  indicating the number of competencies and relationships found.
	 *
	 *  @param {Object}            file
	 *                             ASN JSON file
	 *  @param {Callback1<Object>} success
	 *                             Callback triggered on successful analysis of file
	 *  @param {Callback1<Object>} [failure]
	 *                             Callback triggered if there is an error during analysis of the file
	 *  @memberOf ASNImport
	 *  @method analyzeFile
	 *  @static
	 */
	static analyzeFile(file, success, failure) {
		if (file == null) {
			failure("No file to analyze");
			return;
		}
		if (file["name"] == null) {
			failure("Invalid file");
			return;
		} else if (!file["name"].endsWith(".json")) {
			failure("Invalid file type");
			return;
		}
		let reader = new FileReader();
		reader.onload = function(e) {
			let result = e["target"]["result"];
			let jsonObj = JSON.parse(result);
			ASNImport.jsonCompetencies = {};
			ASNImport.jsonFramework = null;
			ASNImport.frameworkUrl = "";
			for (let each in jsonObj) {
				if (each !== EcRemoteLinkedData.trimVersionFromUrl(each)) {
					let trimmed = EcRemoteLinkedData.trimVersionFromUrl(each);
					jsonObj[trimmed] = jsonObj[each];
					delete jsonObj[each];
				}
			}
			ASNImport.lookThroughSource(jsonObj);
			if (ASNImport.jsonFramework == null) {
				failure("Could not find StandardDocument.");
			} else {
				success(ASNImport.jsonCompetencies);
			}
		};
		reader.readAsText(file, "UTF-8");
	}
	/**
	 *  Method to import the competencies from an ASN JSON file,
	 *  should be called after analyzing the file
	 *
	 *  @param {String}                        serverUrl
	 *                                         URL Prefix for the competencies to be imported
	 *  @param {EcIdentity}                    owner
	 *                                         EcIdentity that will own the new competencies
	 *  @param {boolean}                       createFramework
	 *                                         Flag to create a framework and include the competencies and relationships created
	 *  @param {Callback2<Array<EcCompetency>, EcFramework>} success
	 *                                         Callback triggered after the competencies (and framework?) are created
	 *  @param {Callback1<Object>}             failure
	 *                                         Callback triggered if an error occurs while creating the competencies
	 *  @param {Callback1<Object>}             [incremental]
	 *                                         Callback triggered incrementally during the creation of competencies to indicate progress,
	 *                                         returns an object indicating the number of competencies (and relationships?) created so far
	 *  @memberOf ASNImport
	 *  @method importCompetencies
	 *  @static
	 */
	static importCompetencies(serverUrl,owner,createFramework,success,failure,incremental,repo,eim) {
		ASNImport.competencies = {};
		if (eim === undefined || eim == null) {
			eim = EcIdentityManager.default;
		}
		if (createFramework) {
			ASNImport.importedFramework = new EcFramework();
			ASNImport.importedFramework.competency = [];
			ASNImport.importedFramework.relation = [];
		} else {
			ASNImport.importedFramework = null;
		}
		ASNImport.progressObject = null;
		ASNImport.createCompetencies(
			serverUrl,
			owner,
			function() {
				ASNImport.createRelationships(
					serverUrl,
					owner,
					ASNImport.jsonFramework,
					null,
					function() {
						if (createFramework) {
							ASNImport.createFramework(
								serverUrl,
								owner,
								success,
								failure,
								repo,
								eim
							);
						} else {
							let compList = [];
							for (let key in ASNImport.competencies) {
								compList.push(ASNImport.competencies[key]);
							}
							if (success != null) success(compList, null);
						}
					},
					failure,
					incremental,
					repo,
					eim
				);
			},
			failure,
			incremental,
			repo,
			eim
		);
	}
	/**
	 *  Handles creating the competencies found during analysis, iterates through the
	 *  competency ASN objects saved and creates them in the CASS repository at the URL given.
	 *
	 *  @param {String}            serverUrl
	 *                             URL Prefix for the competencies to be imported
	 *  @param {EcIdentity}        owner
	 *                             EcIdentity that will own the new competencies
	 *  @param {Callback0}         success
	 *                             Callback triggered after the competencies are created
	 *  @param {Callback1<Object>} failure
	 *                             Callback triggered if an error occurs while creating the competencies
	 *  @param {Callback1<Object>} [incremental]
	 *                             Callback triggered incrementally during the creation of competencies to indicate progress
	 *  @memberOf ASNImport
	 *  @method createCompetencies
	 *  @private
	 *  @static
	 */
	static createCompetencies(serverUrl,owner,success,failure,incremental,repo,eim) {
		ASNImport.savedCompetencies = 0;
		for (let key in ASNImport.jsonCompetencies) {
			let comp = new EcCompetency();
			let jsonComp = ASNImport.jsonCompetencies[key];
			if (jsonComp["http://purl.org/dc/elements/1.1/title"] == null)
				comp.name =
					jsonComp["http://purl.org/dc/terms/description"]["0"][
						"value"
					];
			else
				comp.name =
					jsonComp["http://purl.org/dc/elements/1.1/title"]["0"][
						"value"
					];
			if (jsonComp["http://purl.org/dc/terms/description"] != null)
				comp.description =
					jsonComp["http://purl.org/dc/terms/description"]["0"][
						"value"
					];
			comp.id = key;
			if (comp.id == null) {
				if (repo?.selectedServer.includes(serverUrl) ?? true)
					comp.generateId(serverUrl);
				else comp.generateShortId(serverUrl);
			}
			if (owner != null) comp.addOwner(owner.ppk.toPk());
			if (ASNImport.importedFramework != null)
				ASNImport.importedFramework.addCompetency(comp.shortId());
			ASNImport.competencies[key] = comp;
			ASNImport.saveCompetency(success, failure, incremental, comp, repo, eim);
		}
	}
	static saveCompetency(success, failure, incremental, comp, repo, eim) {
		Task.asyncImmediate(function(o) {
			let keepGoing = o;
			comp.save(
				function(p1) {
					ASNImport.savedCompetencies++;
					if (
						ASNImport.savedCompetencies %
							ASNImport.INCREMENTAL_STEP ==
						0
					) {
						if (ASNImport.progressObject == null)
							ASNImport.progressObject = {};
						ASNImport.progressObject["competencies"] =
							ASNImport.savedCompetencies;
						incremental(ASNImport.progressObject);
					}
					if (
						ASNImport.savedCompetencies == ASNImport.competencyCount
					) {
						if (ASNImport.progressObject == null)
							ASNImport.progressObject = {};
						ASNImport.progressObject["competencies"] =
							ASNImport.savedCompetencies;
						incremental(ASNImport.progressObject);
						success();
					}
					keepGoing();
				},
				function(p1) {
					failure("Failed to save competency");
					keepGoing();
				},
				repo, eim
			);
		});
	}
	/**
	 *  Handles creating the relationships from the file analyzed earlier.
	 *  Recursively travels through looking for the hasChild field and creates
	 *  relationships based off of that.
	 *
	 *  @param {String}            serverUrl
	 *                             URL Prefix for the relationships to be imported
	 *  @param {EcIdentity}        owner
	 *                             EcIdentity that will own the new relationships
	 *  @param {Object}            node
	 *  @param {String}            nodeId
	 *  @param {Callback0}         success
	 *                             Callback triggered after the relationships are created
	 *  @param {Callback1<Object>} failure
	 *                             Callback triggered if an error occurs while creating the relationships
	 *  @param {Callback1<Object>} incremental
	 *                             Callback triggered incrementally during the creation of relationships to indicate progress
	 *  @memberOf ASNImport
	 *  @method createRelationships
	 *  @private
	 *  @static
	 */
	static createRelationships(serverUrl,owner,node,nodeId,success,failure,incremental,repo,eim) {
		ASNImport.savedRelations = 0;
		if (ASNImport.relationCount == 0) {
			success();
		}
		let children = node["http://purl.org/gem/qualifiers/hasChild"];
		if (children == null) return;
		for (let child of children) {
			let sourceId = EcRemoteLinkedData.trimVersionFromUrl(child["value"]);
			if (nodeId != null) {
				let relation = new EcAlignment();
				relation.target = EcRemoteLinkedData.trimVersionFromUrl(ASNImport.competencies[nodeId].id);
				relation.source = EcRemoteLinkedData.trimVersionFromUrl(ASNImport.competencies[sourceId].id);
				relation.relationType = "narrows";
				relation.name = "";
				relation.description = "";
				if (repo?.selectedServer.includes(serverUrl) ?? true)
					relation.generateId(serverUrl);
				else 
					relation.generateShortId(serverUrl);
				if (owner != null) 
					relation.addOwner(owner.ppk.toPk());
				if (ASNImport.importedFramework != null)
					ASNImport.importedFramework.addRelation(relation.shortId());
				ASNImport.saveRelation(
					success,
					failure,
					incremental,
					relation,
					repo,
					eim
				);
			}
			ASNImport.createRelationships(
				serverUrl,
				owner,
				ASNImport.jsonCompetencies[sourceId],
				sourceId,
				success,
				failure,
				incremental,
				repo,
				eim
			);
		}
	}
	static saveRelation(success, failure, incremental, relation, repo, eim) {
		Task.asyncImmediate(function(o) {
			let keepGoing = o;
			relation.save(
				function(p1) {
					ASNImport.savedRelations++;
					if (ASNImport.savedRelations % ASNImport.INCREMENTAL_STEP == 0) {
						if (ASNImport.progressObject == null)
							ASNImport.progressObject = {};
						ASNImport.progressObject["relations"] = ASNImport.savedRelations;
						incremental(ASNImport.progressObject);
					}
					if (ASNImport.savedRelations == ASNImport.relationCount) {
						success();
					}
					keepGoing();
				},
				function(p1) {
					failure("Failed to save Relationship");
					keepGoing();
				},
				repo, eim
			);
		});
	}
	/**
	 *  Handles creating the framework if the createFramework flag was set
	 *
	 *  @param {String}                        serverUrl
	 *                                         URL Prefix for the framework to be imported
	 *  @param {EcIdentity}                    owner
	 *                                         EcIdentity that will own the new framework
	 *  @param {Callback2<Array<EcCompetency>, EcFramework>} success
	 *                                         Callback triggered after the framework is created
	 *  @param {Callback1<Object>}             failure
	 *                                         Callback triggered if there is an error during the creation of framework
	 *  @meberOf ASNImport
	 *  @method createFramework
	 *  @private
	 *  @static
	 */
	static createFramework(serverUrl, owner, success, failure, repo, eim) {
		ASNImport.importedFramework.name = ASNImport.jsonFramework["http://purl.org/dc/elements/1.1/title"]["0"]["value"];
		if (ASNImport.jsonFramework["http://purl.org/dc/terms/description"])
			ASNImport.importedFramework.description = ASNImport.jsonFramework["http://purl.org/dc/terms/description"]["0"]["value"];
		ASNImport.importedFramework.id = ASNImport.frameworkUrl;
		if (ASNImport.importedFramework.id == null) {
			if (repo?.selectedServer.includes(serverUrl) ?? true)
				ASNImport.importedFramework.generateId(serverUrl);
			else 
				ASNImport.importedFramework.generateShortId(serverUrl);
		}
		if (owner != null)
			ASNImport.importedFramework.addOwner(owner.ppk.toPk());
		ASNImport.importedFramework.save(
			function(p1) {
				let compList = [];
				for (let key in ASNImport.competencies) {
					compList.push(ASNImport.competencies[key]);
				}
				if (success != null)
					success(compList, ASNImport.importedFramework);
			},
			function(p1) {
				failure("Failed to save framework");
			},
			repo, eim
		);
	}
};
