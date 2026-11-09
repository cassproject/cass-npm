module.exports = class TabStructuredImport {
	/**
	 *  Method to create competencies (and relationships if the parameters are passed in)
	 *  based on a CSV file and references to which columns correspond to which pieces
	 *  of data.
	 *
	 *  @param {Object}                        text
	 *                                         Text to extract competencies from
	 *  @param {String}                        serverUrl
	 *                                         URL Prefix for the created competencies (and relationships?)
	 *  @param {EcIdentity}                    owner
	 *                                         EcIdentity that will own the created competencies (and relationships?)
	 *  @param {Callback2<Array<EcCompetency>, Array<EcAlignment>>} success
	 *                                         Callback triggered after the competencies (and relationships?) have been created
	 *  @param {Callback1<Object>}             [failure]
	 *                                         Callback triggered if an error during creating the competencies
	 *  @param {Callback1<Object>}             [incremental]
	 *                                         Callback triggered incrementally during creation of competencies to indicate progress,
	 *                                         returns an object indicating the number of competencies (and relationships?) created so far
	 *  @param {EcRepository}                  repo
	 *                                         Repository to save any new data to, or to use to generate IDs.
	 *  @memberOf TabStructuredImport
	 *  @method importCompetencies
	 *  @static
	 */
	static async importCompetencies(
		text,
		serverUrl,
		owner,
		success,
		failure,
		incremental,
		repo,
		hashNameForId
	) {
		let lines = text.split("\n");
		let competencies = [];
		let alignments = [];
		for (let i = 0; i < lines.length; i++)
			TabStructuredImport.parseLinesIntoHierarchy(
				lines,
				competencies,
				alignments,
				i,
				serverUrl,
				hashNameForId,
				repo
			);
		await success(competencies, alignments);
	}
	static parseLinesIntoHierarchy(
		lines,
		competencies,
		alignments,
		index,
		serverUrl,
		hashNameForId,
		repo
	) {
		let parentI = -1;
		for (let i = index - 1; i >= 0; i--) {
			if (
				TabStructuredImport.tabs(lines[i]) <
				TabStructuredImport.tabs(lines[index])
			) {
				parentI = i;
				break;
			}
		}
		let c = null;
		for (let competency of competencies) {
			if (competency.getName().trim() == lines[index].trim()) {
				c = competency;
				break;
			}
		}
		if (c == null) {
			c = new EcCompetency();
			if (hashNameForId)
				c.assignId(serverUrl, EcCrypto.md5(lines[index].trim()));
			else if (serverUrl != repo.selectedServer)
				c.generateShortId(serverUrl);
			else c.generateId(serverUrl);
			c.setName(lines[index]);
			competencies.push(c);
		}
		if (parentI != -1) {
			let parent = null;
			for (let competency of competencies) {
				if (competency.getName().trim() == lines[parentI].trim()) {
					parent = competency;
					break;
				}
			}
			if (parent != null && parent.shortId() != c.shortId()) {
				let a = new EcAlignment();
				if (serverUrl != repo.selectedServer)
					a.generateShortId(serverUrl);
				else a.generateId(serverUrl);
				a.relationType = EcAlignment.NARROWS;
				a.source = c.shortId();
				a.target = parent.shortId();
				alignments.push(a);
			}
		}
	}
	static tabs(line) {
		let tabs = 0;
		for (let i = 0; i < line.length; i++) {
			let c = line.charAt(i);
			if (c == "\t" || c == " ") tabs++;
			else return tabs;
		}
		return tabs;
	}
};
