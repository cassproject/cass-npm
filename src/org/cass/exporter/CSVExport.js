const EcArray = require("../../../com/eduworks/ec/array/EcArray");
const EcObject = require("../../../com/eduworks/ec/array/EcObject");
const EcRepository = require("../../cassproject/ebac/repository/EcRepository");

global.Papa = require("papaparse");
/**
 *  Export methods to handle exporting two CSV file , one of competencies
 *  and one of relationships representing a framework
 *
 *  @author devlin.junker@eduworks.com
 *  @author fritz.ray@eduworks.com
 *  @module org.cassproject
 *  @class CSVExport
 *  @static
 *  @extends Exporter
 */
module.exports = class CSVExport extends Exporter {
	static frameworkCompetencies = null;
	static frameworkRelations = null;
	static exportObjects(objects, fileName, piped) {
		let compExport = new CSVExport.CSVExportProcess();
		compExport.buildExport(objects, piped);
		compExport.downloadCSV(fileName);
	}
	static exportCTDLASN(json, name) {
		let objects = [];
		CSVExport.findGraphs(json, objects);
		CSVExport.exportObjects(objects, name + ".csv", true);
	}
	static findGraphs(json, objects) {
		let jsonArray;
		if (!EcArray.isArray(json)) {
			jsonArray = [json];
		} else {
			jsonArray = json;
		}
		for (let framework of jsonArray) {
			let graph = framework["@graph"];
			if (graph != null) {
				for (let g of graph) {
					let rld = new EcRemoteLinkedData(
						"https://credreg.net/ctdlasn/schema/context/json",
						g["@type"]
					);
					rld.copyFrom(g);
					objects.push(rld);
					if (g["@graph"] != null) {
						CSVExport.findGraphs(g, objects);
					}
				}
			}
		}
	}
	/**
	 *  Method to export the CSV files of competencies and relationships for a framework
	 *
	 *  @param {String}            frameworkId
	 *                             Id of the framework to export
	 *  @param {Callback0}         success
	 *                             Callback triggered after both files have been successfully exported
	 *  @param {Callback1<String>} failure
	 *                             Callback triggered if an error occurs during export
	 *  @memberOf CSVExport
	 *  @method export
	 *  @static
	 */
	static exportFramework(frameworkId, success, failure, repo, eim) {
		if (frameworkId == null) {
			failure("Framework not selected.");
			return;
		}
		CSVExport.frameworkCompetencies = [];
		CSVExport.frameworkRelations = [];
		return EcRepository.get(
			frameworkId,
			function (data) {
				if (data.isAny(new EcFramework().getTypes())) {
					let fw = new EcFramework();
					fw.copyFrom(data);
					if (fw.competency == null || fw.competency.length == 0)
						failure("No Competencies in Framework");
					for (let competencyUrl of fw.competency) {
						EcRepository.get(
							competencyUrl,
							function (competency) {
								CSVExport.frameworkCompetencies.push(
									competency
								);
								if (
									CSVExport.frameworkCompetencies.length ==
									fw.competency.length
								) {
									let compExport = new CSVExport.CSVExportProcess();
									compExport.buildExport(
										CSVExport.frameworkCompetencies,
										false
									);
									compExport.downloadCSV(
										fw.getName() + " - Competencies.csv"
									);
								}
							},
							function (s) {
								CSVExport.frameworkCompetencies.push(null);
								if (
									CSVExport.frameworkCompetencies.length ==
									fw.competency.length
								) {
									let compExport = new CSVExport.CSVExportProcess();
									compExport.buildExport(
										CSVExport.frameworkCompetencies,
										false
									);
									compExport.downloadCSV(
										fw.getName() + " - Competencies.csv"
									);
								}
							}, repo, eim);
					}
					for (let relationUrl of fw.relation) {
						EcRepository.get(
							relationUrl,
							function (relation) {
								CSVExport.frameworkRelations.push(relation);
								if (
									CSVExport.frameworkRelations.length ==
									fw.relation.length
								) {
									let compExport = new CSVExport.CSVExportProcess();
									compExport.buildExport(
										CSVExport.frameworkRelations,
										false
									);
									compExport.downloadCSV(
										fw.getName() + " - Relations.csv"
									);
									if (success != null && success != undefined)
										success();
								}
							},
							function (s) {
								CSVExport.frameworkRelations.push(null);
								if (
									CSVExport.frameworkRelations.length ==
									fw.relation.length
								) {
									let compExport = new CSVExport.CSVExportProcess();
									compExport.buildExport(
										CSVExport.frameworkRelations,
										false
									);
									compExport.downloadCSV(
										fw.getName() + " - Relations.csv"
									);
									if (success != null && success != undefined)
										success();
								}
							}, repo, eim);
					}
				}
			},
			failure, repo, eim
		);
	}
	static CSVExportProcess = class CSVExportProcess {
		csvOutput = null;
		constructor() {
			this.csvOutput = [];
		}
		flattenObject(flattenedObject, object, prefix, piped) {
			let data = new EcRemoteLinkedData(
				object["@context"],
				object["@type"]
			);
			data.copyFrom(object);
			let tempObj = JSON.parse(data.toJson());
			let props = tempObj;
			for (let prop in props) {
				let id;
				if (prefix != null && prefix != undefined && !piped)
					id = prefix + "." + prop;
				else id = prop;
				if (
					props[prop] != null &&
					props[prop] != "" &&
					EcObject.isObject(props[prop]) &&
					!piped
				) {
					this.flattenObject(flattenedObject, props[prop], id, false);
				} else if (
					props[prop] != null &&
					props[prop] != "" &&
					(EcObject.isObject(props[prop]) ||
						EcArray.isArray(props[prop])) &&
					piped
				) {
					let display = "";
					let props2 = props[prop];
					for (let prop2 in props2) {
						if (EcArray.isArray(props2[prop2])) {
							for (let prop3 in props2[prop2]) {
								display += props2[prop2][prop3] + "|";
							}
						} else {
							display += props2[prop2] + "|";
						}
					}
					display = display.substring(0, display.length - 1);
					flattenedObject[id] = display;
				} else {
					let display = schema.Thing.getDisplayStringFrom(props[prop]);
					flattenedObject[id] = display;
				}
			}
		}
		addCSVRow(object, piped) {
			let flattenedObject = new EcRemoteLinkedData(
				object.context,
				object.type
			);
			this.flattenObject(flattenedObject, object, null, piped);
			this.csvOutput.push(JSON.parse(flattenedObject.toJson()));
			let props = JSON.parse(flattenedObject.toJson());
			for (let prop in props) {
				if (props[prop] != null && props[prop] != "") {
					for (let row of this.csvOutput) {
						if (row[prop] === undefined) {
							row[prop] = "";
						}
					}
				}
			}
		}
		buildExport(objects, piped) {
			for (let object of objects.filter(x=>x)) {
				this.addCSVRow(object, piped);
			}
		}
		downloadCSV(name) {
			let csv = Papa.unparse(this.csvOutput);
			let pom = window.document.createElement("a");
			pom.setAttribute(
				"href",
				"data:text/csv;charset=utf-8," + encodeURIComponent(csv)
			);
			pom.setAttribute("download", name);
			if (window.document["createEvent"] != null) {
				let event = window.document["createEvent"].call( //NOSONAR - false positive
					window.document,
					"MouseEvents"
				);
				event["initEvent"].call(event, "click", true, true); //NOSONAR - false positive
				pom.dispatchEvent(event);
			} else {
				pom["click"].call(pom); //NOSONAR - false positive
			}
		}
	};
};
