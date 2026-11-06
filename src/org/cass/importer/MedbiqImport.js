/**
 *  Importer methods to create competencies based on a
 *  Medbiquitous competency XML file
 *
 *  @author devlin.junker@eduworks.com
 *  @author fritz.ray@eduworks.com
 *  @module org.cassproject
 *  @class MedbiqImport
 *  @static
 *  @extends Importer
 */
module.exports = class MedbiqImport extends Importer {
	static INCREMENTAL_STEP = 5;
	static medbiqXmlCompetencies = null;
	static progressObject = null;
	static saved = 0;
	/**
	 *  Does the legwork of looking for competencies in the XML
	 *
	 *  @param {Object} obj
	 *                  Parsed XML Object
	 *  @memberOf MedbiqImport
	 *  @method medbiqXmlLookForCompetencyObject
	 *  @private
	 *  @static
	 */
	static medbiqXmlLookForCompetencyObject(obj) {
		if (Importer.isObject(obj) || Importer.isArray(obj))
			for (let key in obj) {
				if (key == "CompetencyObject")
					MedbiqImport.medbiqXmlParseCompetencyObject(obj[key]);
				else MedbiqImport.medbiqXmlLookForCompetencyObject(obj[key]);
			}
	}
	/**
	 *  Does the legwork of parsing the competencies out of the parsed XML
	 *
	 *  @param {Object} obj
	 *                  Parsed XML Object
	 *  @memberOf MedbiqImport
	 *  @method medbiqXmlParseCompetencyObject
	 *  @private
	 *  @static
	 */
	static medbiqXmlParseCompetencyObject(obj) {
		if (Importer.isArray(obj)) {
			for (let key in obj) {
				MedbiqImport.medbiqXmlParseCompetencyObject(obj[key]);
			}
		} else {
			let newCompetency = new EcCompetency();
			if (obj["lom"]?.["general"] != null) {
				newCompetency.name = obj["lom"]["general"]["title"][
					"string"
				].toString();
				if (obj["lom"]["general"]["description"] != null)
					newCompetency.description = obj["lom"]["general"][
						"description"
					]["string"].toString();
				if (obj["lom"]["general"]["identifier"] != null)
					newCompetency.url = obj["lom"]["general"]["identifier"][
						"entry"
					].toString();
				if (newCompetency.description == null)
					newCompetency.description = "";
				MedbiqImport.medbiqXmlCompetencies.push(newCompetency);
			}
		}
	}
	/**
	 *  Analyzes a Medbiquitous XML file for competencies and saves them for use in the import process
	 *
	 *  @param {Object}                         file
	 *                                          Medbiquitous XML file
	 *  @param {Callback1<Array<EcCompetency>>} success
	 *                                          Callback triggered on succesfully analyzing competencies,
	 *                                          returns an array of all of the competencies found
	 *  @param {Callback1<String>}              [failure]
	 *                                          Callback triggered on error analyzing file
	 *  @memberOf MedbiqImport
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
		} else if (!file["name"].endsWith(".xml")) {
			failure("Invalid file type");
			return;
		}
		let reader = new FileReader();
		reader.onload = function(e) {
			let result = e["target"]["result"];
			let jsonObject = new X2JS().xml_str2json(result);
			MedbiqImport.medbiqXmlCompetencies = [];
			MedbiqImport.medbiqXmlLookForCompetencyObject(jsonObject);
			success(MedbiqImport.medbiqXmlCompetencies);
		};
		reader.onerror = function(p1) {
			failure("Error Reading File");
		};
		reader.readAsText(file, "UTF-8");
	}
	/**
	 *  Method for actually creating the competencies in the CASS repository after a
	 *  Medbiquitous XML file has been parsed. Must be called after analyzeFile
	 *
	 *  @param {String}                         serverUrl
	 *                                          URL Prefix for the created competencies (and relationships?)
	 *  @param {EcIdentity}                     owner
	 *                                          EcIdentity that will own the created competencies (and relationships?)
	 *  @param {Callback1<Array<EcCompetency>>} success
	 *                                          Callback triggered after successfully creating the competencies from the XML file
	 *  @param {Callback1<Object>}              [failure]
	 *                                          Callback triggered if there is an error while creating the competencies
	 *  @param {Callback1<Object>}              [incremental]
	 *                                          Callback triggered incrementally while the competencies are being created to show progress,
	 *                                          returns an object indicating the number of competencies created so far
	 *  @memberOf MedbiqImport
	 *  @method importCompetencies
	 *  @static
	 */
	static importCompetencies(
		serverUrl,
		owner,
		success,
		failure,
		incremental,
		repo
	) {
		MedbiqImport.progressObject = null;
		MedbiqImport.saved = 0;
		for (let comp of MedbiqImport.medbiqXmlCompetencies) {
			if (repo?.selectedServer.includes(serverUrl) ?? true)
				comp.generateId(serverUrl);
			else comp.generateShortId(serverUrl);
			if (owner != null) comp.addOwner(owner.ppk.toPk());
			MedbiqImport.saveCompetency(
				success,
				failure,
				incremental,
				comp,
				repo
			);
		}
	}
	static saveCompetency(success, failure, incremental, comp, repo, eim) {
		Task.asyncImmediate(function(o) {
			let keepGoing = o;
			let scs = function(p1) {
				MedbiqImport.saved++;
				if (MedbiqImport.saved % MedbiqImport.INCREMENTAL_STEP == 0) {
					if (MedbiqImport.progressObject == null)
						MedbiqImport.progressObject = {};
					MedbiqImport.progressObject["competencies"] =
						MedbiqImport.saved;
					incremental(MedbiqImport.progressObject);
				}
				if (
					MedbiqImport.saved ==
					MedbiqImport.medbiqXmlCompetencies.length
				) {
					if (MedbiqImport.progressObject == null)
						MedbiqImport.progressObject = {};
					MedbiqImport.progressObject["competencies"] =
						MedbiqImport.saved;
					incremental(MedbiqImport.progressObject);
					success(MedbiqImport.medbiqXmlCompetencies);
				}
				keepGoing();
			};
			let err = function(p1) {
				failure("Failed to Save Competency");
				keepGoing();
			};
			comp.save(scs, err, repo, eim);
		});
	}
};
