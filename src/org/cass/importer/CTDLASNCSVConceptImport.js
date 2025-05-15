const EcArray = require("../../../com/eduworks/ec/array/EcArray");

const jsonld = require("jsonld");

let isNode = false;    
if (typeof process === 'object') {
  if (typeof process.versions === 'object') {
    if (typeof process.versions.node !== 'undefined') {
      isNode = true;
    }
  }
}

const jsonldCache = {}; // Cache JSONLD documents to avoid multiple requests when doing recast
const docLoader = isNode ? jsonld.documentLoaders.node() : jsonld.documentLoaders.xhr(); // Different document loader for node and browser
const customDocLoader = async (url, options) => {
	if(url in jsonldCache) {
	  return {
		contextUrl: null, // this is for a context via a link header
		document: jsonldCache[url], // this is the actual document that was loaded
		documentUrl: url // this is the actual context URL after redirects
	  };
	}
	// call the default documentLoader
	let result = docLoader(url);
	  result.then((x) => {
		  if (x && x.document) {
			  jsonldCache[url] = x.document;
		  }
	  })
	  return result;
};

module.exports = class CTDLASNCSVConceptImport {
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
				let conceptSchemeCounter = 0;
				let conceptCounter = 0;
				let progressionCounter = 0;
				let typeCol = nameToCol["@type"];
				if (typeCol == null) {
					this.error("No @type in CSV.");
					return;
				}
				for (let i = 0; i < tabularData.length; i++) {
					if (i == 0) continue;
					let col = tabularData[i];
					if (col[typeCol] == "skos:ConceptScheme") conceptSchemeCounter++;
					else if (col[typeCol] == "asn:ProgressionModel") progressionCounter++;
					else if (col[typeCol] == "skos:Concept") conceptCounter++;
					else if (col[typeCol] == "asn:ProgressionLevel") conceptCounter++;
					else if (col[typeCol] == null || col[typeCol] == "" || col[typeCol].toLowerCase().startsWith('sample') || col[typeCol].toLowerCase().startsWith('instruction'))
						continue;
					else {
						this.error("Found unknown type:" + col[typeCol]);
						return;
					}
				}
				success(conceptSchemeCounter, conceptCounter, progressionCounter);
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
		progressionsFlag
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
		if (progressionsFlag) {
			return this.importProgressions(repo, file, success, failure, ceo, endpoint, eim);
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
				const terms = JSON.parse(JSON.stringify((await EcRemote.getExpectingObject("https://schema.cassproject.org/0.4/jsonld1.1/ceasn2cassConceptsTerms"))));
				let schemeArray = [];
				let concepts = [];
				for (let each = 0; each < tabularData.length; each++) {
					let pretranslatedE = tabularData[each];
					// Probably an empty newline, skip
					if (!pretranslatedE["@id"]) {
						continue;
					}
					if (
						pretranslatedE["@type"].toLowerCase().startsWith('sample') || pretranslatedE["@type"].toLowerCase().startsWith('instruction')
					) {
						continue;
					}
					if (pretranslatedE["@type"] == "skos:ConceptScheme") {
						let translator = new EcLinkedData(null, null);
						translator.copyFrom(pretranslatedE);
						CTDLASNCSVImport.cleanUpTranslator(
							translator,
							endpoint,
							repo
						);
						try {
							let existing = await EcRepository.get(translator.id);
							if (existing && existing.type !== translator.type) {
								return failure(`Row ${i + 2}: ${translator.id} already exists as a ${existing.type}`);
							}
						} catch (e) {
							console.error(e);
						}
						if (translator["ceasn:name"] != null) {
							let name = translator["ceasn:name"];
							let nameWithLanguage = {};
							nameWithLanguage["en-US"] = name;
							translator["ceasn:name"] = nameWithLanguage;
						}
						for (let each in translator) {
							if (terms[each]) {
								translator[terms[each]] = translator[each];
								delete translator[each];
							}
						}
						let e = await translator.recast(
							"https://schema.cassproject.org/0.4/jsonld1.1/ceasn2cassConcepts.json",
							"https://schema.cassproject.org/0.4/skos",
							customDocLoader
						);
						if (e["ceterms:AgentSector"] != null) {
							e["https://purl.org/ctdl/terms/AgentSector"] = e["ceterms:AgentSector"];
							delete e["ceterms:AgentSector"];
						}
						e.type = "ConceptScheme";
						let f = new EcConceptScheme();
						f.copyFrom(e);
						if (EcConceptScheme.template != null) {
							for (let key in EcConceptScheme.template) {
								if (key.equals("@owner")) {
									f["owner"] =
										EcConceptScheme.template[
											key
										];
								} else {
									f[key] =
										EcConceptScheme.template[
											key
										];
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
						f[
							"schema:dateModified"
						] = new Date().toISOString();
						if (
							EcConceptScheme.template != null &&
							EcConceptScheme.template[
								"schema:dateCreated"
							] != null
						) {
							CTDLASNCSVImport.setDateCreated(e, f);
						}
						schemeArray.push(f);
					} else if (pretranslatedE["@type"] == "skos:Concept") {
						let translator = new EcLinkedData(null, null);
						translator.copyFrom(pretranslatedE);
						CTDLASNCSVImport.cleanUpTranslator(
							translator,
							endpoint,
							repo
						);
						if (translator["skos:prefLabel"] != null) {
							let name = translator["skos:prefLabel"];
							let nameWithLanguage = {};
							nameWithLanguage["en-US"] = name;
							translator["skos:prefLabel"] = nameWithLanguage;
						}
						for (let each in translator) {
							if (terms[each]) {
								translator[terms[each]] = translator[each];
								delete translator[each];
							}
						}
						let e = await translator.recast(
							"https://schema.cassproject.org/0.4/jsonld1.1/ceasn2cassConcepts.json",
							"https://schema.cassproject.org/0.4/skos",
							customDocLoader
						);
						e.type = "Concept";
						let f = new EcConcept();
						f.copyFrom(e);
						if (e["id"] == null) {
							return;
						}
						if (
							EcConcept.template != null &&
							EcConcept.template["@owner"] != null
						) {
							f["owner"] =
								EcConcept.template["@owner"];
						}
						if (e["owner"] != null) {
							let id = new EcIdentity();
							id.ppk = EcPpk.fromPem(e["owner"]);
							if (id.ppk != null)
								f.addOwner(id.ppk.toPk());
							eim.addIdentityQuietly(
								id
							);
						}
						if (ceo != null) f.addOwner(ceo.ppk.toPk());
						if (
							EcConcept.template != null &&
							EcConcept.template[
								"schema:dateCreated"
							] != null
						) {
							CTDLASNCSVImport.setDateCreated(e, f);
						}
						if (e["skos:narrower"] != null) {
							let relation = e["skos:narrower"];
							if (!EcArray.isArray(relation)) {
								let array = [relation];
								f["skos:narrower"] = array;
							}
						}
						if (e["skos:broader"] != null) {
							let relation = e["skos:broader"];
							if (!EcArray.isArray(relation)) {
								let array = [relation];
								f["skos:broader"] = array;
							}
						}
						if (e["skos:broadMatch"] != null) {
							let relation = e["skos:broadMatch"];
							if (!EcArray.isArray(relation)) {
								let array = [relation];
								f["skos:broadMatch"] = array;
							}
						}
						if (e["skos:closeMatch"] != null) {
							let relation = e["skos:closeMatch"];
							if (!EcArray.isArray(relation)) {
								let array = [relation];
								f["skos:closeMatch"] = array;
							}
						}
						if (e["skos:exactMatch"] != null) {
							let relation = e["skos:exactMatch"];
							if (!EcArray.isArray(relation)) {
								let array = [relation];
								f["skos:exactMatch"] = array;
							}
						}
						if (e["skos:narrowMatch"] != null) {
							let relation = e["skos:narrowMatch"];
							if (!EcArray.isArray(relation)) {
								let array = [relation];
								f["skos:narrowMatch"] = array;
							}
						}
						if (e["skos:related"] != null) {
							let relation = e["skos:related"];
							if (!EcArray.isArray(relation)) {
								let array = [relation];
								f["skos:related"] = array;
							}
						}
						if (e["skos:topConceptOf"] != null) {
							let scheme = e["skos:topConceptOf"];
							for (
								let i = 0;
								i < schemeArray.length;
								i++
							) {
								let schemeObj = schemeArray[i];
								if (scheme == schemeObj["id"]) {
									if (
										schemeObj[
											"skos:hasTopConcept"
										] == null
									) {
										let hasTopConcept = [];
										schemeObj[
											"skos:hasTopConcept"
										] = hasTopConcept;
									}
									let conceptId = f.shortId();
									EcArray.setAdd(
										schemeObj[
											"skos:hasTopConcept"
										],
										conceptId
									);
								}
							}
						}
						f[
							"schema:dateModified"
						] = new Date().toISOString();
						concepts.push(f);
					} else if (
						pretranslatedE["@type"] == null ||
						pretranslatedE["@type"] == ""
					) {
						return;
					} else {
						this.error(
							"Found unknown type:" + pretranslatedE["@type"]
						);
						return;
					}
				}
				success(schemeArray, concepts);
			},
			error: failure
		});
	}
	static importProgressions(
		repo,
		file,
		success,
		failure,
		ceo,
		endpoint,
		eim
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
				const terms = JSON.parse(JSON.stringify((await EcRemote.getExpectingObject("https://schema.cassproject.org/0.4/jsonld1.1/ceasn2cassConceptsTerms"))));
				let schemeArray = [];
				let concepts = [];
				for (let each = 0; each < tabularData.length; each++) {
					let pretranslatedE = tabularData[each];
					if (
						pretranslatedE["@type"].toLowerCase().startsWith('sample') || pretranslatedE["@type"].toLowerCase().startsWith('instruction')
					) {
						continue;
					}
					if (pretranslatedE["@type"] == "asn:ProgressionModel") {
						let translator = new EcLinkedData(null, null);
						translator.copyFrom(pretranslatedE);
						CTDLASNCSVImport.cleanUpTranslator(
							translator,
							endpoint,
							repo
						);
						try {
							let existing = await EcRepository.get(translator.id);
							if (existing && existing.type !== translator.type) {
								return failure(`Row ${i + 2}: ${translator.id} already exists as a ${existing.type}`);
							}
						} catch (e) {
							console.error(e);
						}
						if (translator["ceasn:name"] != null) {
							let name = translator["ceasn:name"];
							let nameWithLanguage = {};
							nameWithLanguage["en-US"] = name;
							translator["ceasn:name"] = nameWithLanguage;
						}
						for (let each in translator) {
							if (terms[each]) {
								translator[terms[each]] = translator[each];
								delete translator[each];
							}
						}
						let e = await translator.recast(
							"https://schema.cassproject.org/0.4/jsonld1.1/ceasn2cassConcepts.json",
							"https://schema.cassproject.org/0.4/skos",
							customDocLoader
						);
						e.type = "ConceptScheme";
						let f = new EcConceptScheme();
						f.copyFrom(e);
						if (EcConceptScheme.template != null) {
							for (let key in EcConceptScheme.template) {
								if (key.equals("@owner")) {
									f["owner"] =
										EcConceptScheme.template[
											key
										];
								} else {
									f[key] =
										EcConceptScheme.template[
											key
										];
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
						f[
							"schema:dateModified"
						] = new Date().toISOString();
						if (
							EcConceptScheme.template != null &&
							EcConceptScheme.template[
								"schema:dateCreated"
							] != null
						) {
							CTDLASNCSVImport.setDateCreated(e, f);
						}
						f.subType = "Progression";
						schemeArray.push(f);
					} else if (pretranslatedE["@type"] == "asn:ProgressionLevel") {
						let translator = new EcLinkedData(null, null);
						translator.copyFrom(pretranslatedE);
						CTDLASNCSVImport.cleanUpTranslator(
							translator,
							endpoint,
							repo
						);
						if (translator["skos:prefLabel"] != null) {
							let name = translator["skos:prefLabel"];
							let nameWithLanguage = {};
							nameWithLanguage["en-US"] = name;
							translator["skos:prefLabel"] = nameWithLanguage;
						}
						for (let each in translator) {
							if (terms[each]) {
								translator[terms[each]] = translator[each];
								delete translator[each];
							}
						}
						let e = await translator.recast(
							"https://schema.cassproject.org/0.4/jsonld1.1/ceasn2cassConcepts.json",
							"https://schema.cassproject.org/0.4/skos",
							customDocLoader
						);
						e.type = "Concept";
						let f = new EcConcept();
						f.copyFrom(e);
						if (e["id"] == null) {
							return;
						}
						if (
							EcConcept.template != null &&
							EcConcept.template["@owner"] != null
						) {
							f["owner"] =
								EcConcept.template["@owner"];
						}
						if (e["owner"] != null) {
							let id = new EcIdentity();
							id.ppk = EcPpk.fromPem(e["owner"]);
							if (id.ppk != null)
								f.addOwner(id.ppk.toPk());
							eim.addIdentityQuietly(
								id
							);
						}
						if (ceo != null) f.addOwner(ceo.ppk.toPk());
						if (
							EcConcept.template != null &&
							EcConcept.template[
								"schema:dateCreated"
							] != null
						) {
							CTDLASNCSVImport.setDateCreated(e, f);
						}
						if (e["skos:narrower"] != null) {
							let relation = e["skos:narrower"];
							if (!EcArray.isArray(relation)) {
								let array = [relation];
								f["skos:narrower"] = array;
							}
						}
						if (e["skos:broader"] != null) {
							let relation = e["skos:broader"];
							if (!EcArray.isArray(relation)) {
								let array = [relation];
								f["skos:broader"] = array;
							}
						}
						if (e["skos:topConceptOf"] != null) {
							let scheme = e["skos:topConceptOf"];
							for (
								let i = 0;
								i < schemeArray.length;
								i++
							) {
								let schemeObj = schemeArray[i];
								if (scheme == schemeObj["id"]) {
									if (
										schemeObj[
											"skos:hasTopConcept"
										] == null
									) {
										let hasTopConcept = [];
										schemeObj[
											"skos:hasTopConcept"
										] = hasTopConcept;
									}
									let conceptId = f.shortId();
									EcArray.setAdd(
										schemeObj[
											"skos:hasTopConcept"
										],
										conceptId
									);
								}
							}
						}
						f[
							"schema:dateModified"
						] = new Date().toISOString();
						f.subType = "Progression";
						concepts.push(f);
					} else if (
						pretranslatedE["@type"] == null ||
						pretranslatedE["@type"] == ""
					) {
						return;
					} else {
						this.error(
							"Found unknown type:" + pretranslatedE["@type"]
						);
						return;
					}
				}
				success(schemeArray, concepts);
			},
			error: failure
		});
	}
};
