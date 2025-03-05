const EcArray = require("../../../com/eduworks/ec/array/EcArray");
const EcRemote = require("../../../com/eduworks/ec/remote/EcRemote");

module.exports = class CTDLASNCSVImport {
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
				let colNames = tabularData[0];
				let nameToCol = {};
				for (let i = 0; i < colNames.length; i++)
					nameToCol[colNames[i]] = i;
				let frameworkCounter = 0;
				let competencyCounter = 0;
				let collectionCounter = 0;
				let duplicates = [];
				let uniqueRows = [];
				let typeCol = nameToCol["@type"];
				let uniqueRowIndexes = [];
				if (typeCol == null) {
					this.error("No @type in CSV.");
					return;
				}
				// Search for duplicate competencies with different CTIDs
				if (tabularData[0]) {
					const colId = tabularData[0].findIndex((element) => element.toLowerCase().contains("@id"));
					const colCtid = tabularData[0].findIndex((element) => element.toLowerCase().contains("ceterms:ctid"));
					const colCompetencyText = tabularData[0].findIndex((element) => element.toLowerCase().contains("ceasn:competencytext"));
					const colCodedNotation = tabularData[0].findIndex((element) => element.toLowerCase().contains("ceasn:codednotation"));
					if (colCtid >= 0) {
						for (let i = 1; i < tabularData.length; i++) {
							const row = tabularData[i].filter((element, j) => (j !== colCtid) && (j !== colId));
							const existing = uniqueRowIndexes.findIndex((uniqueRow) => uniqueRow.every((each, k) => each === row[k]))
							if (existing < 0) {
								uniqueRowIndexes.push(row);
								uniqueRows.push({
									competencyText: colCompetencyText >= 0 ? tabularData[i][colCompetencyText] : undefined,
									ctid: tabularData[i][colCtid],
									codedNotation: colCodedNotation >= 0 ? tabularData[i][colCodedNotation] : undefined,
									line: i
								});
							} else {
								const originalAlreadyAdded = duplicates.find((duplicate) => duplicate.line === uniqueRows[existing].line);
								if (!originalAlreadyAdded) {
									duplicates.push(uniqueRows[existing]);
								}
								duplicates.push({
									competencyText: colCompetencyText >= 0 ? tabularData[i][colCompetencyText] : undefined,
									ctid: tabularData[i][colCtid],
									codedNotation: colCodedNotation >= 0 ? tabularData[i][colCodedNotation] : undefined,
									line: i
								});
							}
						}
						duplicates.sort((a, b) => a.competencyText < b.competencyText ? -1 : 1);
					}
					for (let i = 0; i < tabularData.length; i++) {
						if (i == 0) continue;
						let col = tabularData[i];
						if (
							col[typeCol] != null &&
							col[typeCol].trim() == "ceasn:CompetencyFramework"
						)
							frameworkCounter++;
						else if (
								col[typeCol] != null &&
								col[typeCol].trim() == "ceterms:Collection"
							)
								collectionCounter++;
						else if (
							col[typeCol] != null &&
							col[typeCol].trim() == "ceasn:Competency"
						) {
							competencyCounter++;
							if (colCompetencyText && !col[colCompetencyText].trim()) {
								this.error('CTDLASN Parse Error: Competency text is empty on line ' + (i+1));
								return;
							}
						} else if (col[typeCol] == null || col[typeCol] == "" || col[typeCol].toLowerCase().startsWith('sample') || col[typeCol].toLowerCase().startsWith('instruction'))
							continue;
						else {
							this.error("Found unknown type:" + col[typeCol]);
							return;
						}
					}
				}
				
				success(frameworkCounter, competencyCounter, collectionCounter, duplicates);
			},
			error: failure
		});
	}
	static importFrameworksAndCompetencies(
		repo,
		file,
		success,
		failure,
		ceo,
		endpoint,
		eim,
		collectionsFlag,
		skip
	) {
		if (eim === undefined || eim == null)
			eim = EcIdentityManager.default;
		if (file == null) {
			failure("No file to analyze");
			return;
		}
		if (file["name"] == null) {
			failure("Invalid file");
		} else if (!file["name"].endsWith(".csv")) {
			failure("Invalid file type");
		}
		if (collectionsFlag) {
			return this.importCollectionsAndCompetencies(repo, file, success, failure, ceo, endpoint, eim, skip);
		}
		Papa.parse(file, {
			header: true,
			encoding: "UTF-8",
			complete: async function(results) {
				let tabularData = results["data"];
				try {
					for (let data of tabularData) {
						for (let [key, value] of Object.entries(data)) {
							data[key] = value.trim();
						}
					}
				} catch (e) {
					console.error('Error trimming data', e);
				}
				
				const terms = JSON.parse(JSON.stringify((await EcRemote.getExpectingObject("https://schema.cassproject.org/0.4/jsonld1.1/ceasn2cassTerms"))));
				let frameworks = {};
				let frameworkArray = [];
				let frameworkRows = {};
				let competencies = [];
				let competencyRows = {};
				let relations = [];
				let relationById = {};
				for (let i = 0; i < tabularData.length; i++) {
					if (!tabularData[i]) {
						continue;
					}
					let pretranslatedE = tabularData[i];
					// Skip extra lines if found in file
					if (!pretranslatedE || !pretranslatedE["@type"]) {
						continue;
					}
					if (pretranslatedE["@type"].toLowerCase() && 
						(pretranslatedE["@type"].toLowerCase().startsWith('sample') || pretranslatedE["@type"].toLowerCase().startsWith('instruction'))
					) {
						continue;
					}
					if (pretranslatedE["ceterms:CTID"]) {
						if (!pretranslatedE["ceterms:ctid"]) {
							pretranslatedE["ceterms:ctid"] = pretranslatedE["ceterms:CTID"];
						}
						delete pretranslatedE["ceterms:CTID"];
					}
					// Skip competency if ctid is specified
					if (skip && Array.isArray(skip) && skip.length > 0) {
						if (skip.find((element) => element.ctid ? element.ctid.includes(pretranslatedE["ceterms:ctid"]) : element === pretranslatedE["ceterms:ctid"])) {
							continue;
						}
					}
					if (!pretranslatedE["@id"]) {
						failure(`Row ${i + 2}: is missing an @id`)
						return;
					}
					if (
						pretranslatedE["@type"] ==
						"ceasn:CompetencyFramework"
					) {
						let translator = new EcLinkedData(null, null);
						translator.copyFrom(pretranslatedE);
						CTDLASNCSVImport.cleanUpTranslator(
							translator,
							endpoint,
							repo
						);
						for (let each in translator) {
							// Make replacements for skipped duplicates
							if (skip && Array.isArray(skip) && skip.length > 0) {
								skip.forEach((element) => {
									if (typeof translator[each] === 'string' && element.ctid && element.replaceWith) {
										if (translator[each].contains(element.ctid.replace('ce-', ''))) {
											translator[each] = translator[each].replace(element.ctid.replace('ce-', ''), element.replaceWith.replace('ce-', ''));
										}
									}
								});
							}
						}
						for (let each in translator) {
							if (terms[each]) {
								translator[terms[each]] = translator[each];
								delete translator[each];
							}
							if (each === "type" || each === "@type") {
								translator[each] = "Framework";
							}
						}
						let e = await translator.recast(
							"https://schema.cassproject.org/0.4/jsonld1.1/ceasn2cass.json",
							"https://schema.cassproject.org/0.4"
						);
						let f = new EcFramework();
						f.copyFrom(e);
						if (EcFramework.template != null) {
							for (let key in EcFramework.template) {
								if (key.equals("@owner")) {
									f["owner"] =
										EcFramework.template[key];
								} else {
									f[key] =
										EcFramework.template[key];
								}
							}
						}
						if (e["owner"] != null) {
							let id = new EcIdentity();
							id.ppk = EcPpk.fromPem(e["owner"]);
							f.addOwner(id.ppk.toPk());
							eim.addIdentityQuietly(
								id
							);
						}
						if (ceo != null) f.addOwner(ceo.ppk.toPk());
						if (
							EcFramework.template != null &&
							EcFramework.template[
								"schema:dateCreated"
							] != null
						) {
							CTDLASNCSVImport.setDateCreated(e, f);
						}
						if (f["ceasn:educationLevelType"] != null) {
							let val = f["ceasn:educationLevelType"];
							if (!EcArray.isArray(val)) {
								val = [val];
							}
							for (let i = val.length-1; i >=0; i--) {
								if (!val[i].startsWith('http')) {
									if (val[i] === "AdvancedLevel" || val[i] === "AssociatesDegreeLevel" || val[i] === "BachelorsDegreeLevel" || val[i] === "BeginnerLevel" ||
									val[i] === "DoctoralDegreeLevel" || val[i] === "GraduateLevel" || val[i] === "IntermediateLevel" || val[i] === "LowerDivisionLevel" ||
									val[i] === "MastersDegreeLevel" || val[i] === "PostSecondaryLevel" || val[i] === "ProfessionalLevel" || val[i] === "SecondaryLevel" ||
									val[i] === "UndergraduateLevel" || val[i] === "UpperDivisionLevel") {
										val[i] = "https://credreg.net/ctdl/vocabs/audLevel/" + val[i];
									} else {
										val.splice(i, 1);
									}
								}
							}
							f["ceasn:educationLevelType"] = val;
						}
						if (f["ceasn:publicationStatusType"] != null) {
							let val = f["ceasn:publicationStatusType"];
							if (!EcArray.isArray(val)) {
								val = [val];
							}
							for (let i = val.length-1; i >=0; i--) {
								if (!val[i].startsWith('http')) {
									if (val[i] === "Deprecated" || val[i] === "Published" || val[i] === "Draft" ) {
										val[i] = "http://credreg.net/ctdlasn/vocabs/publicationStatus/" + val[i];
									} else {
										val.splice(i, 1);
									}
								}
							}
							f["ceasn:publicationStatusType"] = val;
						}
						frameworks[f.shortId()] = f;
						frameworkRows[f.shortId()] = e;
						f["ceasn:hasChild"] = null;
						f["ceasn:hasTopChild"] = null;
						// Remove skipped competencies
						if (skip && Array.isArray(skip) && skip.length > 0 && f.competency) {
							skip.forEach((element) => {
								const id = (element.ctid ? element.ctid : element).replace('ce-', '');								
								const index = f.competency.findIndex((comp) => comp.includes(id));
								if (index) {
									f.competency.splice(index, 1);
								}
							});
						}
						frameworkArray.push(f);
						f.competency = [];
						f.relation = [];
					} else if (
						pretranslatedE["@type"] == "ceasn:Competency"
					) {
						let translator = new EcLinkedData(null, null);
						translator.copyFrom(pretranslatedE);
						CTDLASNCSVImport.cleanUpTranslator(
							translator,
							endpoint,
							repo
						);
						for (let each in translator) {
							// Make replacements for skipped duplicates
							if (skip && Array.isArray(skip) && skip.length > 0) {
								skip.forEach((element) => {
									if (typeof translator[each] === 'string' && element.ctid && element.replaceWith) {
										if (translator[each].contains(element.ctid.replace('ce-', ''))) {
											translator[each] = translator[each].replace(element.ctid.replace('ce-', ''), element.replaceWith.replace('ce-', ''));
										}
									}
								});
							}
						}
						for (let each in translator) {
							if (terms[each]) {
								translator[terms[each]] = translator[each];
								delete translator[each];
							}
							if (each === "type" || each === "@type") {
								translator[each] = "Competency";
							}
						}
						let e = await translator.recast(
							"https://schema.cassproject.org/0.4/jsonld1.1/ceasn2cass.json",
							"https://schema.cassproject.org/0.4"
						);
						let f = new EcCompetency();
						f.copyFrom(e);
						if (e["id"] == null) {
							return;
						}
						if (e["ceasn:isPartOf"] != null) {
							let shortId = EcRemoteLinkedData.trimVersionFromUrl(e["ceasn:isPartOf"]);
							frameworks[shortId].competency.push(f.shortId());
						} else {
							let parent = e;
							let done = false;
							while (!done && parent != null) {
								if (
									parent["ceasn:isChildOf"] !=
										null &&
									parent["ceasn:isChildOf"] != ""
								) {
									parent =
										competencyRows[
											EcRemoteLinkedData.trimVersionFromUrl(
												parent[
													"ceasn:isChildOf"
												]
											)
										];
								} else if (
									parent["ceasn:isTopChildOf"] !=
										null &&
									parent["ceasn:isTopChildOf"] !=
										""
								) {
									parent =
										frameworkRows[
											EcRemoteLinkedData.trimVersionFromUrl(
												parent[
													"ceasn:isTopChildOf"
												]
											)
										];
									done = true;
								} else {
									parent = null;
								}
							}
							if (!done) {
								failure(
									`Row ${i+2}: Could not find framework:${e["type"]} (Possibly missing ceasn:isPartOf or ceasn:isChildOf)`
								);
								return;
							}
							if (parent != null) {
								if (parent["type"] == "Framework") {
									e[
										"ceasn:isPartOf"
									] = EcRemoteLinkedData.trimVersionFromUrl(
										parent["id"]
									);
									frameworks[
										EcRemoteLinkedData.trimVersionFromUrl(
											parent["id"]
										)
									].competency.push(f.shortId());
								} else {
									failure(
										`Row ${i+2}: Object cannot trace to framework:` +
											e["type"]
									);
									return;
								}
							} else {
								failure(
									`Row ${i+2}: Object has no framework:` +
										e["type"]
								);
								return;
							}
						}
						if (
							EcCompetency.template != null &&
							EcCompetency.template["@owner"] != null
						) {
							f["owner"] =
								EcCompetency.template["@owner"];
						}
						if (e["owner"] == null) {
							if (
								frameworkRows[EcRemoteLinkedData.trimVersionFromUrl(e["ceasn:isPartOf"])][
									"owner"
								] != null
							)
								e["owner"] =
									frameworkRows[EcRemoteLinkedData.trimVersionFromUrl(
										e["ceasn:isPartOf"]
									)]["owner"];
						}
						let id = new EcIdentity();
						if (e["owner"] != null) {
							id.ppk = EcPpk.fromPem(e["owner"]);
							if (id.ppk != null)
								f.addOwner(id.ppk.toPk());
							eim.addIdentityQuietly(
								id
							);
						}
						if (ceo != null) f.addOwner(ceo.ppk.toPk());
						if (
							EcCompetency.template != null &&
							EcCompetency.template[
								"schema:dateCreated"
							] != null
						) {
							CTDLASNCSVImport.setDateCreated(e, f);
						}
						if (f["ceasn:educationLevelType"] != null) {
							let val = f["ceasn:educationLevelType"];
							if (!EcArray.isArray(val)) {
								val = [val];
							}
							for (let i = val.length-1; i >=0; i--) {
								if (!val[i].startsWith('http')) {
									if (val[i] === "AdvancedLevel" || val[i] === "AssociatesDegreeLevel" || val[i] === "BachelorsDegreeLevel" || val[i] === "BeginnerLevel" ||
									val[i] === "DoctoralDegreeLevel" || val[i] === "GraduateLevel" || val[i] === "IntermediateLevel" || val[i] === "LowerDivisionLevel" ||
									val[i] === "MastersDegreeLevel" || val[i] === "PostSecondaryLevel" || val[i] === "ProfessionalLevel" || val[i] === "SecondaryLevel" ||
									val[i] === "UndergraduateLevel" || val[i] === "UpperDivisionLevel") {
										val[i] = "https://credreg.net/ctdl/vocabs/audLevel/" + val[i];
									} else {
										val.splice(i, 1);
									}
								}
							}
							f["ceasn:educationLevelType"] = val;
						}
						if (f["ceasn:publicationStatusType"] != null) {
							let val = f["ceasn:publicationStatusType"];
							if (!EcArray.isArray(val)) {
								val = [val];
							}
							for (let i = val.length-1; i >=0; i--) {
								if (!val[i].startsWith('http')) {
									if (val[i] === "Deprecated" || val[i] === "Published" || val[i] === "Draft" ) {
										val[i] = "http://credreg.net/ctdlasn/vocabs/publicationStatus/" + val[i];
									} else {
										val.splice(i, 1);
									}
								}
							}
							f["ceasn:publicationStatusType"] = val;
						}
						if (e["ceasn:isChildOf"] != null) {
							CTDLASNCSVImport.createEachRelation(
								e,
								"ceasn:isChildOf",
								Relation.NARROWS,
								repo,
								ceo,
								id,
								relations,
								relationById,
								frameworks,
								-1,
								endpoint
							);
						}
						if (e["ceasn:broadAlignment"] != null) {
							CTDLASNCSVImport.createRelations(
								e,
								"ceasn:broadAlignment",
								Relation.NARROWS,
								repo,
								ceo,
								id,
								relations,
								relationById,
								frameworks,
								endpoint
							);
						}
						if (e["ceasn:narrowAlignment"] != null) {
							CTDLASNCSVImport.createRelations(
								e,
								"ceasn:narrowAlignment",
								Relation.NARROWS,
								repo,
								ceo,
								id,
								relations,
								relationById,
								frameworks,
								endpoint
							);
						}
						if (e["sameAs"] != null) {
							CTDLASNCSVImport.createRelations(
								e,
								"sameAs",
								Relation.IS_EQUIVALENT_TO,
								repo,
								ceo,
								id,
								relations,
								relationById,
								frameworks,
								endpoint
							);
						}
						if (e["ceasn:majorAlignment"] != null) {
							CTDLASNCSVImport.createRelations(
								e,
								"ceasn:majorAlignment",
								"majorRelated",
								repo,
								ceo,
								id,
								relations,
								relationById,
								frameworks,
								endpoint
							);
						}
						if (e["ceasn:minorAlignment"] != null) {
							CTDLASNCSVImport.createRelations(
								e,
								"ceasn:minorAlignment",
								"minorRelated",
								repo,
								ceo,
								id,
								relations,
								relationById,
								frameworks,
								endpoint
							);
						}
						if (
							e["ceasn:prerequisiteAlignment"] != null
						) {
							CTDLASNCSVImport.createRelations(
								e,
								"ceasn:prerequisiteAlignment",
								Relation.REQUIRES,
								repo,
								ceo,
								id,
								relations,
								relationById,
								frameworks,
								endpoint
							);
						}
						f["ceasn:isTopChildOf"] = null;
						f["ceasn:isChildOf"] = null;
						f["ceasn:isPartOf"] = null;
						f["ceasn:broadAlignment"] = null;
						f["ceasn:narrowAlignment"] = null;
						f["sameAs"] = null;
						f["ceasn:majorAlignment"] = null;
						f["ceasn:minorAlignment"] = null;
						f["ceasn:prerequisiteAlignment"] = null;
						f["ceasn:hasChild"] = null;
						competencies.push(f);
						competencyRows[f.shortId()] = e;
					} else if (
						pretranslatedE["@type"] == null ||
						pretranslatedE["@type"] == ""
					) {
						return;
					} else {
						failure(
							`Row ${i+2}: Found unknown type:` + pretranslatedE["@type"]
						);
						return;
					}
				}
				success(frameworkArray, competencies, relations);
			},
			error: failure
		});
	}
	static importCollectionsAndCompetencies(
		repo,
		file,
		success,
		failure,
		ceo,
		endpoint,
		eim,
		skip
	) {
		Papa.parse(file, {
			header: true,
			encoding: "UTF-8",
			complete: async function(results) {
				let tabularData = results["data"];
				try {
					for (let data of tabularData) {
						for (let [key, value] of Object.entries(data)) {
							data[key] = value.trim();
						}
					}
				} catch (e) {
					console.error('Error trimming data', e);
				}

				const terms = JSON.parse(JSON.stringify((await EcRemote.getExpectingObject("https://schema.cassproject.org/0.4/jsonld1.1/ceasn2cassTerms"))));
				let frameworks = {};
				let frameworkArray = [];
				let frameworkRows = {};
				let competencies = [];
				let competencyRows = {};
				let relations = [];
				let relationById = {};
				for (let i = 0; i < tabularData.length; i++) {
					let pretranslatedE = tabularData[i];
					// Skip extra lines if found in file
					if (!pretranslatedE || !pretranslatedE["@type"]) {
						continue;
					}
					if (
						pretranslatedE["@type"].toLowerCase().startsWith('sample') || pretranslatedE["@type"].toLowerCase().startsWith('instruction')
					) {
						continue;
					}
					if (pretranslatedE["ceterms:CTID"]) {
						if (!pretranslatedE["ceterms:ctid"]) {
							pretranslatedE["ceterms:ctid"] = pretranslatedE["ceterms:CTID"];
						}
						delete pretranslatedE["ceterms:CTID"];
					}
					// Skip competency if ctid is specified
					if (skip && Array.isArray(skip) && skip.length > 0) {
						if (skip.find((element) => element.ctid ? element.ctid.includes(pretranslatedE["ceterms:ctid"]) : element === pretranslatedE["ceterms:ctid"])) {
							continue;
						}
					}
					if (
						pretranslatedE["@type"] ==
						"ceterms:Collection"
					) {
						let translator = new EcLinkedData(null, null);
						translator.copyFrom(pretranslatedE);
						CTDLASNCSVImport.cleanUpTranslator(
							translator,
							endpoint,
							repo
						);
						for (let each in translator) {
							if (terms[each]) {
								translator[terms[each]] = translator[each];
								delete translator[each];
							}
							if (each === "type" || each === "@type") {
								translator[each] = "Framework";
							}
						}
						let e = await translator.recast(
							"https://schema.cassproject.org/0.4/jsonld1.1/ceasn2cass.json",
							"https://schema.cassproject.org/0.4"
						);
						let f = new EcFramework();
						f.copyFrom(e);
						if (EcFramework.template != null) {
							for (let key in EcFramework.template) {
								if (key.equals("@owner")) {
									f["owner"] =
										EcFramework.template[key];
								} else {
									f[key] =
										EcFramework.template[key];
								}
							}
						}
						if (e["owner"] != null) {
							let id = new EcIdentity();
							id.ppk = EcPpk.fromPem(e["owner"]);
							f.addOwner(id.ppk.toPk());
							eim.addIdentityQuietly(
								id
							);
						}
						if (ceo != null) f.addOwner(ceo.ppk.toPk());
						if (
							EcFramework.template != null &&
							EcFramework.template[
								"schema:dateCreated"
							] != null
						) {
							CTDLASNCSVImport.setDateCreated(e, f);
						}
						frameworks[f.shortId()] = f;
						frameworkRows[f.shortId()] = e;
						frameworkArray.push(f);
						f.competency = f["ceterms:hasMember"] || [];
						// Remove skipped competencies
						if (skip && Array.isArray(skip) && skip.length > 0 && f.competency) {
							skip.forEach((element) => {
								const id = (element.ctid ? element.ctid : element).replace('ce-', '');								
								const index = f.competency.findIndex((comp) => comp.includes(id));
								if (index) {
									f.competency.splice(index, 1);
								}
							});
						}
						delete f["ceterms:hasMember"];
						f.relation = [];
						f.subType = "Collection";
					} else if (
						pretranslatedE["@type"] == "ceasn:Competency"
					) {
						let translator = new EcLinkedData(null, null);
						translator.copyFrom(pretranslatedE);
						CTDLASNCSVImport.cleanUpTranslator(
							translator,
							endpoint,
							repo
						);
						for (let each in translator) {
							if (terms[each]) {
								translator[terms[each]] = translator[each];
								delete translator[each];
							}
							if (each === "type" || each === "@type") {
								translator[each] = "Competency";
							}
						}
						let e = await translator.recast(
							"https://schema.cassproject.org/0.4/jsonld1.1/ceasn2cass.json",
							"https://schema.cassproject.org/0.4"
						);
						let f = new EcCompetency();
						f.copyFrom(e);
						if (e["id"] == null) {
							return;
						}
						if (e["ceterms:isMemberOf"] != null) {
							if (!EcArray.isArray(e["ceterms:isMemberOf"])) {
								e["ceterms:isMemberOf"] = [e["ceterms:isMemberOf"]];
							}
							for (let each in e["ceterms:isMemberOf"]) {
								let shortId = EcRemoteLinkedData.trimVersionFromUrl(e["ceterms:isMemberOf"][each]);
								if (frameworks[shortId]) {
									EcArray.setAdd(frameworks[shortId].competency, f.shortId());
								}
							}
						}
						if (
							EcCompetency.template != null &&
							EcCompetency.template["@owner"] != null
						) {
							f["owner"] =
								EcCompetency.template["@owner"];
						}
						if (e["owner"] == null) {
							if (
								frameworkRows[EcRemoteLinkedData.trimVersionFromUrl(e["ceterms:isMemberOf"][0])] &&
								frameworkRows[EcRemoteLinkedData.trimVersionFromUrl(e["ceterms:isMemberOf"][0])]["owner"] != null
							)
								e["owner"] =
									frameworkRows[EcRemoteLinkedData.trimVersionFromUrl(
										e["ceterms:isMemberOf"][0]
									)]["owner"];
						}
						let id = new EcIdentity();
						if (e["owner"] != null) {
							id.ppk = EcPpk.fromPem(e["owner"]);
							if (id.ppk != null)
								f.addOwner(id.ppk.toPk());
							eim.addIdentityQuietly(
								id
							);
						}
						if (ceo != null) f.addOwner(ceo.ppk.toPk());
						if (
							EcCompetency.template != null &&
							EcCompetency.template[
								"schema:dateCreated"
							] != null
						) {
							CTDLASNCSVImport.setDateCreated(e, f);
						}
						if (f["ceasn:educationLevelType"] != null) {
							let val = f["ceasn:educationLevelType"];
							if (!EcArray.isArray(val)) {
								val = [val];
							}
							for (let i = val.length-1; i >=0; i--) {
								if (!val[i].startsWith('http')) {
									if (val[i] === "AdvancedLevel" || val[i] === "AssociatesDegreeLevel" || val[i] === "BachelorsDegreeLevel" || val[i] === "BeginnerLevel" ||
									val[i] === "DoctoralDegreeLevel" || val[i] === "GraduateLevel" || val[i] === "IntermediateLevel" || val[i] === "LowerDivisionLevel" ||
									val[i] === "MastersDegreeLevel" || val[i] === "PostSecondaryLevel" || val[i] === "ProfessionalLevel" || val[i] === "SecondaryLevel" ||
									val[i] === "UndergraduateLevel" || val[i] === "UpperDivisionLevel") {
										val[i] = "https://credreg.net/ctdl/vocabs/audLevel/" + val[i];
									} else {
										val.splice(i, 1);
									}
								}
							}
							f["ceasn:educationLevelType"] = val;
						}
						if (f["ceasn:publicationStatusType"] != null) {
							let val = f["ceasn:publicationStatusType"];
							if (!EcArray.isArray(val)) {
								val = [val];
							}
							for (let i = val.length-1; i >=0; i--) {
								if (!val[i].startsWith('http')) {
									if (val[i] === "Deprecated" || val[i] === "Published" || val[i] === "Draft" ) {
										val[i] = "http://credreg.net/ctdlasn/vocabs/publicationStatus/" + val[i];
									} else {
										val.splice(i, 1);
									}
								}
							}
							f["ceasn:publicationStatusType"] = val;
						}
						if (e["ceasn:broadAlignment"] != null) {
							CTDLASNCSVImport.createRelations(
								e,
								"ceasn:broadAlignment",
								Relation.NARROWS,
								repo,
								ceo,
								id,
								relations,
								relationById,
								frameworks,
								endpoint,
								true
							);
						}
						if (e["ceasn:narrowAlignment"] != null) {
							CTDLASNCSVImport.createRelations(
								e,
								"ceasn:narrowAlignment",
								Relation.NARROWS,
								repo,
								ceo,
								id,
								relations,
								relationById,
								frameworks,
								endpoint,
								true
							);
						}
						if (e["sameAs"] != null) {
							CTDLASNCSVImport.createRelations(
								e,
								"sameAs",
								Relation.IS_EQUIVALENT_TO,
								repo,
								ceo,
								id,
								relations,
								relationById,
								frameworks,
								endpoint,
								true
							);
						}
						if (e["ceasn:majorAlignment"] != null) {
							CTDLASNCSVImport.createRelations(
								e,
								"ceasn:majorAlignment",
								"majorRelated",
								repo,
								ceo,
								id,
								relations,
								relationById,
								frameworks,
								endpoint,
								true
							);
						}
						if (e["ceasn:minorAlignment"] != null) {
							CTDLASNCSVImport.createRelations(
								e,
								"ceasn:minorAlignment",
								"minorRelated",
								repo,
								ceo,
								id,
								relations,
								relationById,
								frameworks,
								endpoint,
								true
							);
						}
						if (
							e["ceasn:prerequisiteAlignment"] != null
						) {
							CTDLASNCSVImport.createRelations(
								e,
								"ceasn:prerequisiteAlignment",
								Relation.REQUIRES,
								repo,
								ceo,
								id,
								relations,
								relationById,
								frameworks,
								endpoint,
								true
							);
						}
						f["ceasn:isTopChildOf"] = null;
						f["ceasn:isChildOf"] = null;
						f["ceasn:isPartOf"] = null;
						f["ceasn:broadAlignment"] = null;
						f["ceasn:narrowAlignment"] = null;
						f["sameAs"] = null;
						f["ceasn:majorAlignment"] = null;
						f["ceasn:minorAlignment"] = null;
						f["ceasn:prerequisiteAlignment"] = null;
						f["ceasn:hasChild"] = null;
						f["ceterms:isMemberOf"] = null;
						competencies.push(f);
						competencyRows[f.shortId()] = e;
					} else if (
						pretranslatedE["@type"] == null ||
						pretranslatedE["@type"] == ""
					) {
						return;
					} else {
						failure(
							`Row ${i+2}: Found unknown type:` + pretranslatedE["@type"]
						);
						return;
					}
				}
				success(frameworkArray, competencies, relations);
			},
			error: failure
		});
	}
	static getIdFromCtid(ctid, endpoint, repo, context, type, key) {
		if (key != "id") {
			if (key == "ceasn:isPartOf" || key == "ceasn:isTopChildOf") {
				if (type == "Competency") {
					type = "Framework";
				} else if (type == "Concept") {
					type = "ConceptScheme";
				}
			} else {
				if (type == "Framework") {
					type = "Competency";
				} else if (type == "ConceptScheme") {
					type = "Concept";
				}
			}
		}
		if (endpoint != null) {
			if (endpoint.indexOf("ce-") != -1) {
				ctid = ctid.substring(3);
			}
			return endpoint + ctid;
		} else {
			ctid = ctid.substring(3);
			let obj = new EcRemoteLinkedData(context, type);
			obj.assignId(repo.selectedServer, ctid);
			if (key == "id") {
				return obj.id;
			} else {
				return obj.shortId();
			}
		}
	}
	static cleanUpTranslator(translator, endpoint, repo) {
		let context = null;
		let type = null;
		if (translator["type"] == "ceasn:CompetencyFramework" || translator["type"] == "ceterms:Collection") {
			context = "https://schema.cassproject.org/0.4/";
			type = "Framework";
		} else if (translator["type"] == "ceasn:Competency") {
			context = "https://schema.cassproject.org/0.4/";
			type = "Competency";
		} else if (translator["type"] == "skos:ConceptScheme") {
			context = "https://schema.cassproject.org/0.4/skos/";
			type = "ConceptScheme";
		} else if (translator["type"] == "ceasn:Concept") {
			context = "https://schema.cassproject.org/0.4/skos/";
			type = "Concept";
		}
		for (let key in translator) {
			if (translator[key] == "") {
				translator[key] = null;
			} else if (translator[key] != null) {
				let thisKey = translator[key];
				if (typeof thisKey == "string") {
					if (translator[key].trim().length == 0) {
						translator[key] = null;
					} else if (thisKey.indexOf("|") != -1) {
						thisKey = thisKey.split("|");
						translator[key] = thisKey;
						for (let i = 0; i < thisKey.length; i++) {
							if (thisKey[i] != thisKey[i].trim()) {
								let thisVal = thisKey[i].trim();
								thisKey[i] = thisVal;
							}
							if (typeof thisKey[i] == "string" &&
								thisKey[i].startsWith("ce-") &&
								key != "ceterms:ctid"
							) {
								let id = CTDLASNCSVImport.getIdFromCtid(
									thisKey[i],
									endpoint,
									repo,
									context,
									type,
									key
								);
								thisKey[i] = id;
							}
						}
					} else if (
						thisKey.startsWith("ce-") &&
						key != "ceterms:ctid"
					) {
						let id = CTDLASNCSVImport.getIdFromCtid(
							thisKey,
							endpoint,
							repo,
							context,
							type,
							key
						);
						translator[key] = id;
					}
				} else if (EcArray.isArray(thisKey)) {
					for (let i = 0; i < thisKey.length; i++) {
						if (
							typeof thisKey[i] == "string" &&
							thisKey[i].startsWith("ce-")
						) {
							let id = CTDLASNCSVImport.getIdFromCtid(
								thisKey[i],
								endpoint,
								repo,
								context,
								type,
								key
							);
							thisKey[i] = id;
						}
					}
				}
				if (key != key.trim()) {
					let trimKey = key.trim();
					translator[trimKey] = translator[key];
					translator[key] = null;
				}
			}
			if (translator[key] == null) {
				delete translator[key];
			}
		}
	}
	static createRelations(
		e,
		field,
		type,
		repo,
		ceo,
		id,
		relations,
		relationById,
		frameworks,
		endpoint,
		collectionFlag
	) {
		if (!EcArray.isArray(e[field])) {
			let makeArray = Array(e[field]);
			e[field] = makeArray;
		}
		for (let i = 0; i < e[field].length; i++) {
			CTDLASNCSVImport.createEachRelation(
				e,
				field,
				type,
				repo,
				ceo,
				id,
				relations,
				relationById,
				frameworks,
				i,
				endpoint,
				collectionFlag
			);
		}
	}
	static createEachRelation(
		e,
		field,
		type,
		repo,
		ceo,
		id,
		relations,
		relationById,
		frameworks,
		i,
		endpoint,
		collectionFlag
	) {
		let r = new EcAlignment();
		if (endpoint != null) {
			r.generateShortId(endpoint);
		} else {
			r.generateId(repo.selectedServer);
		}
		if (ceo != null) r.addOwner(ceo.ppk.toPk());
		if (id.ppk != null) r.addOwner(id.ppk.toPk());
		r.relationType = type;
		if (field == "ceasn:narrowAlignment") {
			let sourceId = e[field][i];
			if (sourceId.startsWith("ce-")) {
				sourceId = CTDLASNCSVImport.getIdFromCtid(
					sourceId,
					endpoint,
					repo,
					"https://schema.cassproject.org/0.4/",
					"Competency",
					field
				);
			}
			r.source = EcRemoteLinkedData.trimVersionFromUrl(sourceId);
			r.target = EcRemoteLinkedData.trimVersionFromUrl(e["id"]);
		} else {
			r.source = EcRemoteLinkedData.trimVersionFromUrl(e["id"]);
			if (i != -1) {
				let targetId = e[field][i];
				if (targetId.startsWith("ce-")) {
					targetId = CTDLASNCSVImport.getIdFromCtid(
						targetId,
						endpoint,
						repo,
						"https://schema.cassproject.org/0.4/",
						"Competency",
						field
					);
				}
				r.target = EcRemoteLinkedData.trimVersionFromUrl(targetId);
			} else {
				let targetId = e[field];
				if (targetId.startsWith("ce-")) {
					targetId = CTDLASNCSVImport.getIdFromCtid(
						targetId,
						endpoint,
						repo,
						"https://schema.cassproject.org/0.4/",
						"Competency",
						field
					);
				}
				r.target = EcRemoteLinkedData.trimVersionFromUrl(targetId);
			}
		}
		relations.push(r);
		relationById[r.shortId()] = r;
		if (collectionFlag) {
			if (!EcArray.isArray(e["ceterms:isMemberOf"])) {
				e["ceterms:isMemberOf"] = [e["ceterms:isMemberOf"]];
			}
			for (let each in e["ceterms:isMemberOf"]) {
				let shortId = EcRemoteLinkedData.trimVersionFromUrl(e["ceterms:isMemberOf"][each]);
				if (frameworks[shortId]) {
					frameworks[shortId].relation.push(r.shortId());
				}
			}
		} else {
			frameworks[EcRemoteLinkedData.trimVersionFromUrl(e["ceasn:isPartOf"])].relation.push(r.shortId());
		}
	}
	static setDateCreated(importObject, object) {
		if (
			importObject["ceasn:dateCreated"] == null &&
			importObject["schema:dateCreated"] == null
		) {
			let timestamp = object.getTimestamp();
			let date;
			if (timestamp != null) {
				date = new Date(parseInt(timestamp)).toISOString();
			} else {
				date = new Date().toISOString();
			}
			object["schema:dateCreated"] = date;
		}
	}
};
