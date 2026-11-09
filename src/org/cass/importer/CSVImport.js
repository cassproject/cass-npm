const EcArray = require("../../../com/eduworks/ec/array/EcArray");
const EcObject = require("../../../com/eduworks/ec/array/EcObject");
const EcRepository = require("../../cassproject/ebac/repository/EcRepository");

/**
 *  Import methods to handle an CSV file of competencies and a
 *  CSV file of relationships and store them in a CASS instance
 *
 *  @author devlin.junker@eduworks.com
 *  @author fritz.ray@eduworks.com
 *  @module org.cassproject
 *  @class CSVImport
 *  @static
 *  @extends Importer
 */
module.exports = class CSVImport {
	static INCREMENTAL_STEP = 5;
	static importCsvLookup = null;
	static saved = 0;
	static progressObject = null;
	/**
	 *  Analyzes a CSV File to return the column names to the user for specifying
	 *  which columns contain which data. This should be called before import.
	 *
	 *  @param {Object}            file
	 *                             CSV file to be analyzed
	 *  @param {Callback1<Object>} success
	 *                             Callback triggered after successfully analyzing the CSV file
	 *  @param {Callback1<Object>} [failure]
	 *                             Callback triggered if there is an error analyzing the CSV file
	 *  @memberOf CSVImport
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
		} else if (!file["name"].endsWith(".csv")) {
			failure("Invalid file type");
		}
		Papa.parse(file, {
			encoding: "UTF-8",
			complete: function(results) {
				let tabularData = results["data"];
				success(tabularData);
			},
			error: failure
		});
	}
	/**
	 *  Helper function to transform a competencies oldID to match the new server url
	 *
	 *  @param {String}             oldId
	 *                              Old ID found in the CSV file
	 *  @param {EcRemoteLinkedData} newObject
	 *                              New competency being created
	 *  @param {String}             selectedServer
	 *                              New URL Prefix that the new competency's ID should match
	 *  @memberOf CSVImport
	 *  @method transformId
	 *  @private
	 *  @static
	 */
	static transformId(oldId, newObject, selectedServer, repo) {
		if (
			oldId == null ||
			oldId == "" ||
			!oldId.toLowerCase().includes("http")
		)
			newObject.assignId(selectedServer, oldId);
		else {
			newObject.id = oldId;
		}
	}
	/**
	 *  Method to create competencies (and relationships if the parameters are passed in)
	 *  based on a CSV file and references to which columns correspond to which pieces
	 *  of data.
	 *
	 *  @param {Object}                        file
	 *                                         CSV File to import competencies from
	 *  @param {String}                        serverUrl
	 *                                         URL Prefix for the created competencies (and relationships?)
	 *  @param {EcIdentity}                    owner
	 *                                         EcIdentity that will own the created competencies (and relationships?)
	 *  @param {int}                           nameIndex
	 *                                         Index of the column that contains the competency names
	 *  @param {int}                           descriptionIndex
	 *                                         Index of the column that contains the competency descriptions
	 *  @param {int}                           scopeIndex
	 *                                         Index of the column that contains the competency scopes
	 *  @param {int}                           idIndex
	 *                                         Index of the column that contains the old competency ID (Optional, if not exists pass null or negative)
	 *  @param {Object}                        [relations]
	 *                                         CSV File to import relationships from (Optional, if not exists pass null)
	 *  @param {int}                           [sourceIndex]
	 *                                         Index (in relation file) of the column containing the relationship source competency ID (Optional, if not exists pass null or negative)
	 *  @param {int}                           [relationTypeIndex]
	 *                                         Index (in relation file) of the column containing the relationship type (Optional, if not exists pass null or negative)
	 *  @param {int}                           [destIndex]
	 *                                         Index (in relation file) of the column containing the relationship destination competency ID (Optional, if not exists pass null or negative)
	 *  @param {Callback2<Array<EcCompetency>, Array<EcAlignment>>} success
	 *                                         Callback triggered after the competencies (and relationships?) have been created
	 *  @param {Callback1<Object>}             [failure]
	 *                                         Callback triggered if an error during creating the competencies
	 *  @param {Callback1<Object>}             [incremental]
	 *                                         Callback triggered incrementally during creation of competencies to indicate progress,
	 *                                         returns an object indicating the number of competencies (and relationships?) created so far
	 *  @memberOf CSVImport
	 *  @method importCompetencies
	 *  @static
	 */
	static importCompetencies(
		file,
		serverUrl,
		owner,
		nameIndex,
		descriptionIndex,
		scopeIndex,
		idIndex,
		relations,
		sourceIndex,
		relationTypeIndex,
		destIndex,
		success,
		failure,
		incremental,
		uniquify,
		repo
	) {
		CSVImport.progressObject = null;
		CSVImport.importCsvLookup = {};
		if (nameIndex < 0) {
			failure("Name Index not Set");
			return;
		}
		let competencies = [];
		Papa.parse(file, {
			encoding: "UTF-8",
			complete: function(results) {
				let tabularData = results["data"];
				let colNames = tabularData[0];
				for (let i = 1; i < tabularData.length; i++) {
					if (
						tabularData[i].length == 0 ||
						tabularData[i].length == 1 &&
							(tabularData[i][0] == null ||
								tabularData[i][0] == undefined ||
								tabularData[i][0] == "")
					) {
						continue;
					}
					if (
						tabularData[i][nameIndex] == null ||
						tabularData[i][nameIndex] == undefined ||
						tabularData[i][nameIndex] == ""
					) {
						continue;
					}
					let competency = new EcCompetency();
					competency.name = tabularData[i][nameIndex];
					if (descriptionIndex >= 0)
						competency.description =
							tabularData[i][descriptionIndex];
					if (scopeIndex >= 0)
						competency.scope = tabularData[i][scopeIndex];
					if (
						(uniquify == undefined ||
							uniquify == null ||
							!uniquify) &&
						idIndex != null &&
						idIndex >= 0
					) {
						competency.id = tabularData[i][idIndex];
						CSVImport.transformId(
							tabularData[i][idIndex],
							competency,
							serverUrl,
							repo
						);
					} else if (repo?.selectedServer.includes(serverUrl) ?? true)
						competency.generateId(serverUrl);
					else 
						competency.generateShortId(serverUrl);
					
					if (owner != undefined && owner != null)
						competency.addOwner(owner.ppk.toPk());
					let shortId = null;
					if (
						idIndex != null &&
						idIndex != undefined &&
						idIndex >= 0
					) {
						let oldId = tabularData[i][idIndex];
						shortId = EcRemoteLinkedData.trimVersionFromUrl(oldId);
						CSVImport.importCsvLookup[
							shortId
						] = competency.shortId();
					}
					if (
						idIndex != null &&
						idIndex != undefined &&
						idIndex >= 0 &&
						tabularData[i][idIndex] != null &&
						tabularData[i][idIndex] != ""
					) {
						if (
							CSVImport.importCsvLookup[
								tabularData[i][idIndex]
							] == null
						)
							CSVImport.importCsvLookup[
								tabularData[i][idIndex]
							] = competency.shortId();
					}
					CSVImport.importCsvLookup[
						competency.getName()
					] = competency.shortId();
					for (let idx = 0; idx < tabularData[i].length; idx++) {
						let name = colNames[idx];
						if (
							name == null ||
							name.trim() == "" ||
							name.startsWith("@") ||
							name.includes(".") ||
							tabularData[i][idx].trim() == "" ||
							idx == nameIndex ||
							idx == descriptionIndex ||
							idx == scopeIndex ||
							idx == idIndex
						) {
							continue;
						} else if ((name === 'owner' || name === 'reader') && !EcArray.isArray(tabularData[i][idx])) {
							competency[colNames[idx]] = [tabularData[i][idx]];
						} else {
							competency[colNames[idx]] = tabularData[i][idx];
						}						
					}
					competencies.push(competency);
				}
				CSVImport.saved = 0;
				for (let comp of competencies) {
					CSVImport.saveCompetency(
						comp,
						incremental,
						competencies,
						relations,
						success,
						serverUrl,
						owner,
						sourceIndex,
						relationTypeIndex,
						destIndex,
						failure,
						repo
					);
				}
			},
			error: failure
		});
	}
	static saveCompetency(
		comp,
		incremental,
		competencies,
		relations,
		success,
		serverUrl,
		owner,
		sourceIndex,
		relationTypeIndex,
		destIndex,
		failure,
		repo, eim
	) {
		Task.asyncImmediate(function(o) {
			let keepGoing = o;
			let saveDone = function(results) {
				CSVImport.saved++;
				if (CSVImport.saved % CSVImport.INCREMENTAL_STEP == 0) {
					if (CSVImport.progressObject == null)
						CSVImport.progressObject = {};
					CSVImport.progressObject["competencies"] = CSVImport.saved;
					incremental(CSVImport.progressObject);
				}
				if (CSVImport.saved == competencies.length) {
					if (relations == null) success(competencies, []);
					else
						CSVImport.importRelations(
							serverUrl,
							owner,
							relations,
							sourceIndex,
							relationTypeIndex,
							destIndex,
							competencies,
							success,
							failure,
							incremental,
							repo
						);
				}
				keepGoing();
			};
			comp.save(saveDone, saveDone, repo, eim);
		});
	}
	/**
	 *  Handles actually importing the relationships from the relationship CSV file
	 *
	 *  @param {String}                        serverUrl
	 *                                         URL Prefix for the created competencies (and relationships?)
	 *  @param {EcIdentity}                    owner
	 *                                         EcIdentity that will own the created competencies (and relationships?)
	 *  @param {Object}                        file
	 *                                         CSV File to import competencies from
	 *  @param {int}                           sourceIndex
	 *                                         Index (in relation file) of the column containing the relationship source competency ID
	 *  @param {int}                           relationTypeIndex
	 *                                         Index (in relation file) of the column containing the relationship type
	 *  @param {int}                           destIndex
	 *                                         Index (in relation file) of the column containing the relationship destination competency ID
	 *  @param {Array<EcCompetency>}           competencies
	 *                                         Array of newly created competencies
	 *  @param {Callback2<Array<EcCompetency>, Array<EcAlignment>>} success
	 *                                         Callback triggered after the relationships have been created
	 *  @param {Callback1<Object>}             failure
	 *                                         Callback triggered if an error during creating the relationships
	 *  @param {Callback1<Object>}             incremental
	 *                                         Callback triggered incrementally during creation to indicate progress
	 *  @memberOf CSVImport
	 *  @method importRelations
	 *  @private
	 *  @static
	 */
	static importRelations(
		serverUrl,
		owner,
		file,
		sourceIndex,
		relationTypeIndex,
		destIndex,
		competencies,
		success,
		failure,
		incremental,
		repo
	) {
		let relations = [];
		if (sourceIndex == null || sourceIndex < 0) {
			failure("Source Index not Set");
			return;
		}
		if (relationTypeIndex == null || relationTypeIndex < 0) {
			failure("Relation Type Index not Set");
			return;
		}
		if (destIndex == null || destIndex < 0) {
			failure("Destination Index not Set");
			return;
		}
		Papa.parse(file, {
			encoding: "UTF-8",
			complete: function(results) {
				let tabularData = results["data"];
				for (let i = 1; i < tabularData.length; i++) {
					// Skip empty rows in the csv
					if (tabularData[i].every(x=>x===''))
						continue;
					let alignment = new EcAlignment();
					let sourceKey = tabularData[i][sourceIndex];
					let relationTypeKey = tabularData[i][relationTypeIndex];
					let destKey = tabularData[i][destIndex];
					if (CSVImport.importCsvLookup[sourceKey] == null)
						alignment.source = sourceKey;
					else
						alignment.source = CSVImport.importCsvLookup[sourceKey];
					if (CSVImport.importCsvLookup[destKey] == null)
						alignment.target = destKey;
					else alignment.target = CSVImport.importCsvLookup[destKey];
					alignment.relationType = relationTypeKey;
					if (owner != null) alignment.addOwner(owner.ppk.toPk());
					if (repo?.selectedServer.includes(serverUrl) ?? true)
						alignment.generateId(serverUrl);
					else alignment.generateShortId(serverUrl);
					relations.push(alignment);
				}
				CSVImport.saved = 0;
				for (let relation of relations) {
					CSVImport.saveRelation(
						relation,
						incremental,
						relations,
						success,
						competencies,
						failure,
						repo
					);
				}
				if (
					CSVImport.saved == 0 &&
					CSVImport.saved == relations.length
				) {
					success(competencies, relations);
				}
			},
			error: failure
		});
	}
	static saveRelation(
		relation,
		incremental,
		relations,
		success,
		competencies,
		failure,
		repo, eim
	) {
		Task.asyncImmediate(function(o) {
			let keepGoing = o;
			relation.save(
				function() {
					CSVImport.saved++;
					if (CSVImport.saved % CSVImport.INCREMENTAL_STEP == 0) {
						if (CSVImport.progressObject == null)
							CSVImport.progressObject = {};
						CSVImport.progressObject["relations"] = CSVImport.saved;
						incremental(CSVImport.progressObject);
						incremental(CSVImport.saved);
					}
					if (CSVImport.saved == relations.length) {
						success(competencies, relations);
					}
					keepGoing();
				},
				function() {
					failure("Failed to save competency or relation");
					for (let competency of competencies) {
						competency._delete(null, null, repo, eim);
					}
					for (let relation of relations) {
						relation._delete(null, null, repo, eim);
					}
					keepGoing();
				},
				repo, eim
			);
		});
	}
	static hasContextColumn(colNames) {
		for (let idx = 0; idx < colNames.length; idx++) {
			if (colNames[idx] == "@context") {
				return idx;
			}
		}
		return -1;
	}
	static hasTypeColumn(colNames) {
		for (let idx = 0; idx < colNames.length; idx++) {
			if (colNames[idx] == "@type") {
				return idx;
			}
		}
		return -1;
	}
	static expandObject(nestedFields, nestedObj, value) {
		if (nestedFields.length == 0) {
			return;
		} else if (nestedFields.length == 1) {
			nestedObj[nestedFields[0]] = value;
		} else {
			let key = nestedFields[0];
			if (nestedObj[key] == null || nestedObj[key] == undefined)
				nestedObj[key] = {};
			nestedFields.splice(0, 1);
			CSVImport.expandObject(nestedFields, nestedObj[key], value);
		}
	}
	static transformReferences(data) {
		let props = data;
		for (let prop in props) {
			if (
				props[prop] == null ||
				props[prop] == undefined ||
				!Object.toString.call(props[prop]).includes("String")
			) {
				if (EcObject.isObject(props[prop])) {
					let nested = props[prop];
					CSVImport.transformReferences(nested);
					data[prop] = nested;
				}
				continue;
			}
			let oldVal = props[prop];
			if (
				CSVImport.importCsvLookup[oldVal] != null &&
				CSVImport.importCsvLookup[oldVal] != undefined &&
				CSVImport.importCsvLookup[oldVal] != ""
			) {
				data[prop] = CSVImport.importCsvLookup[oldVal];
			}
		}
	}
	static importData(
		file,
		serverUrl,
		owner,
		success,
		failure,
		incremental,
		idIndex,
		assignedContext,
		assignedType,
		repo
	) {
		let objects = [];
		let hasAssignedContext =
			assignedContext != undefined &&
			assignedContext != null &&
			assignedContext.trim() != "";
		let hasAssignedType =
			assignedType != undefined &&
			assignedType != null &&
			assignedType.trim() != "";
		CSVImport.importCsvLookup = {};
		Papa.parse(file, {
			encoding: "UTF-8",
			complete: function(results) {
				let tabularData = results["data"];
				let colNames = tabularData[0];
				let contextIdx = -1;
				let typeIdx = -1;
				if (
					!hasAssignedContext &&
					(contextIdx = CSVImport.hasContextColumn(colNames)) == -1
				) {
					failure(
						"Was not passed and cannot find column with data context"
					);
				} else if (
					!hasAssignedType &&
					(typeIdx = CSVImport.hasTypeColumn(colNames)) == 1
				) {
					failure(
						"Was not passed and cannot find column with data type"
					);
				}
				for (let i = 1; i < tabularData.length; i++) {
					if (
						tabularData[i].length == 0 ||
						tabularData[i].length == 1 &&
							(tabularData[i][0] == null ||
								tabularData[i][0] == undefined ||
								tabularData[i][0] == "")
					) {
						continue;
					}
					let context = null;
					let type = null;
					if (hasAssignedContext) context = assignedContext;
					else context = tabularData[i][contextIdx];
					if (hasAssignedType) type = assignedType;
					else type = tabularData[i][typeIdx];
					let data = new EcRemoteLinkedData(context, type);
					let nestedObjs = {};
					for (let idx = 0; idx < tabularData[i].length; idx++) {
						let name = colNames[idx];
						if (name == "@id" || name == "id") {
							data.id = tabularData[i][idx];
							continue;
						} else if (
							name == null ||
							name.trim() == "" ||
							name.startsWith("@") ||
							tabularData[i][idx].trim() == "" ||
							idx == contextIdx ||
							idx == typeIdx
						) {
							continue;
						} else if (name.includes(".")) {
							let split = name.split(".");
							if (split.length > 1) {
								let key = split[0];
								if (
									nestedObjs[key] == null ||
									nestedObjs[key] == undefined
								)
									nestedObjs[key] = {};
								split.splice(0, 1);
								CSVImport.expandObject(
									split,
									nestedObjs[key],
									tabularData[i][idx]
								);
								continue;
							}
							name = split[0];
						}
						let val = tabularData[i][idx];
						data[name] = val;
					}
					for (let key in nestedObjs) {
						data[key] = nestedObjs[key];
					}
					if (owner != null) data.addOwner(owner.ppk.toPk());
					let fileId = data.id;
					if (
						idIndex != undefined &&
						idIndex != null &&
						idIndex >= 0
					) {
						data.id = tabularData[i][idIndex];
						CSVImport.transformId(
							tabularData[i][idIndex],
							data,
							serverUrl,
							repo
						);
					} else if (repo?.selectedServer.includes(serverUrl) ?? true)
						data.generateId(serverUrl);
					else data.generateShortId(serverUrl);
					let shortId;
					if (
						idIndex != null &&
						idIndex != undefined &&
						idIndex >= 0
					) {
						let oldId = tabularData[i][idIndex];
						shortId = EcRemoteLinkedData.trimVersionFromUrl(oldId);
						CSVImport.importCsvLookup[shortId] = data.shortId();
					}
					if (
						idIndex != null &&
						idIndex != undefined &&
						idIndex >= 0 &&
						tabularData[i][idIndex] != null &&
						tabularData[i][idIndex] != ""
					) {
						if (
							CSVImport.importCsvLookup[
								tabularData[i][idIndex]
							] == null
						)
							CSVImport.importCsvLookup[
								tabularData[i][idIndex]
							] = data.shortId();
					} else if (
						fileId != null &&
						fileId != undefined &&
						fileId != ""
					) {
						if (CSVImport.importCsvLookup[fileId] == null)
							CSVImport.importCsvLookup[fileId] = data.shortId();
						shortId = EcRemoteLinkedData.trimVersionFromUrl(fileId);
						if (CSVImport.importCsvLookup[shortId] == null)
							CSVImport.importCsvLookup[shortId] = data.shortId();
					}
					objects.push(data);
				}
				CSVImport.saved = 0;
				for (let data of objects) {
					CSVImport.transformReferences(data);
					CSVImport.saveTransformedData(
						data,
						incremental,
						objects,
						success,
						failure,
						repo
					);
				}
			},
			error: failure
		});
	}
	static saveTransformedData(
		data,
		incremental,
		objects,
		success,
		failure,
		repo,
		eim
	) {
		Task.asyncImmediate(function(o) {
			let keepGoing = o;
			let scs = function(results) {
				CSVImport.saved++;
				if (CSVImport.saved % CSVImport.INCREMENTAL_STEP == 0)
					incremental(CSVImport.saved);
				if (CSVImport.saved == objects.length) success(objects);
				keepGoing();
			};
			let err = function(results) {
				failure("Failed to save object");
				keepGoing();
			};
			if (repo == null) EcRepository.save(data, scs, err, repo, eim);
			else repo.saveTo(data, scs, err, eim);
		});
	}
};
