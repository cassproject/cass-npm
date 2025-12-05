const EcAlignment = require("../../../../org/cass/competency/EcAlignment.js");
const EcCompetency = require("../../../../org/cass/competency/EcCompetency.js");
const EcEncryptedValue = require("../../../../org/cassproject/ebac/repository/EcEncryptedValue.js");
const Relation = require("../../../../org/cassproject/schema/cass/competency/Relation.js");
const EcRemoteLinkedData = require("../../../../org/cassproject/schema/general/EcRemoteLinkedData.js");
const EcArray = require("../array/EcArray.js");
const { cassPromisify } = require("../promises/helpers.js");
const EcDirectedGraph = require("./EcDirectedGraph.js");
const Triple = require("./Triple.js");

/**
 *  Graph for working with a framework. Additional computed data (such as profile data) can be overlaid on the graph through the use of "metaverticies" and "metaedges" that hold additional information.
 *
 *  @author fritz.ray@eduworks.com
 *  @author tom.buskirk@eduworks.com
 *  @class EcFrameworkGraph
 */
module.exports = class EcFrameworkGraph extends EcDirectedGraph {
	constructor(eim) {
		super();
		this.metaVerticies = {};
		this.metaEdges = {};
		this.competencyMap = {};
		this.edgeMap = {};
		this.dontTryAnyMore = {};
		this.frameworks = [];
		this.eim = eim;
	}
	metaVerticies = null;
	metaEdges = null;
	competencyMap = null;
	edgeMap = null;
	dontTryAnyMore = null;
	frameworks = null;
	addFrameworkSuccessCallback = null;
	addFrameworkFailureCallback = null;
	repo = null;
	eim = null;
	competencyPrototype = new EcCompetency();
	alignmentPrototype = new EcAlignment();
	encryptedValuePrototype = new EcEncryptedValue();
	/**
	 *  Adds a framework to the graph, and creates the edges to connect the competencies in the framework.
	 *
	 *  @param {EcFramework}     framework Framework to add to the graph.
	 *  @param {EcRepository}    repo Repository to fetch data from that exists in the framework.
	 *  @param {function()}      success Method to invoke when done adding the framework.
	 *  @param {function(error)} failure Method to invoke when things go badly.
	 *  @method addFramework
	 *  @memberOf EcFrameworkGraph
	 */
	async addFramework(framework, repo, success, failure) {
		this.repo = repo;
		this.frameworks.push(framework);
		if (framework.competency == null) framework.competency = [];
		if (framework.relation == null) framework.relation = [];
		await repo.multiget(
			framework.competency,
			null,
			null,
			this.eim
		).then(async (data) => {
			await Promise.all(
				data.map((d) => this.handleCacheElement(d, framework))
			);
			await repo.multiget(
				framework.relation,
				async (data2) => {
					await Promise.all(
						data2.map((d2) =>
							this.handleCacheElement(d2, framework)
						)
					);
					success();
				},
				failure, this.eim
			);
		}).catch((err) => {
			if (failure != null)
				failure(err);
		});
	}
	/**
	 *  Adds a framework to the graph with only bulk operations, and creates the edges to connect the competencies in the framework.
	 *
	 *  @param {EcFramework}     framework Framework to add to the graph.
	 *  @param {EcRepository}    repo Repository to fetch data from that exists in the framework.
	 *  @param {function()}      success Method to invoke when done adding the framework.
	 *  @param {function(error)} failure Method to invoke when things go badly.
	 *  @method addFrameworkSoft
	 *  @memberOf EcFrameworkGraph
	 */
	async addFrameworkSoft(framework, repo, success, failure) {
		this.repo = repo;
		this.frameworks.push(framework);
		if (framework.competency == null) framework.competency = [];
		if (framework.relation == null) framework.relation = [];
		await repo.precache(
			framework.competency,
			null,
			null,
			this.eim
		).then(async (data) => {
			await Promise.all(
				data.map((d) => this.handleCacheElement(d, framework))
			);
			await repo.precache(
				framework.relation,
				async (data2) => {
					await Promise.all(
						data2.map((d2) =>
							this.handleCacheElement(d2, framework)
						)
					);
					success();
				},
				failure, this.eim
			);
		}).catch((err) => {
			if (failure != null)
				failure(err);
		});
	}
	async handleCacheElement(d, framework) {
		if (d.isAny(this.encryptedValuePrototype.getTypes()))
			d = await EcEncryptedValue.fromEncryptedValue(d, null, null, this.eim);
		if (d == null) return;
		if (d.isAny(this.competencyPrototype.getTypes())) {
			let c = null;
			if (d instanceof EcCompetency)
				c = d;
			else
				c = new EcCompetency().copyFrom(d);
			if (c == null) return;
			this.addToMetaStateArray(
				this.getMetaStateCompetency(c),
				"framework",
				framework
			);
			this.addCompetency(c);
		} else if (d.isAny(this.alignmentPrototype.getTypes())) {
			let alignment = null;
			if (d instanceof EcAlignment)
				alignment = d;
			else
				alignment = new EcAlignment().copyFrom(d);
			if (alignment == null) return;
			await this.addRelation(alignment);
			this.addToMetaStateArray(
				this.getMetaStateAlignment(alignment),
				"framework",
				framework
			);
		}
	}
	/**
	 *  Helper method to populate the graph with assertion data, based on propagation rules implicit in the relations (see devs.cassproject.org, Relations). Does not draw conclusions. Must be able to decrypt 'negative' value.
	 *
	 *  @param {Assertion[]}     assertions Assertion candidates to use to populate the graph.
	 *  @param {function()}      success Method to invoke when the operation completes successfully.
	 *  @param {function(error)} failure Error method.
	 */
	async processAssertionsBoolean(assertions, success, failure) {
		let competencies = {};
		await Promise.all(
			assertions.map(async (assertion) => {
				if (!this.containsVertexById(assertion.competency)) { //O(1)
					return;
				}
				let negative = await assertion.getNegative();
				if (competencies[assertion.competency] == null)
					competencies[assertion.competency] = { positives: [], negatives: [] };
				if (negative)
					competencies[assertion.competency].negatives.push(assertion);
				else
					competencies[assertion.competency].positives.push(assertion);
			})
		)
		await Promise.all(
			Object.keys(competencies).map(async (label) => {
				let competency = await this.getCompetency(label);
				//if (competencies[label].negatives.length > 0)
				await this.processAssertionsBooleanPerAssertion(
					competencies[label].negatives,
					true,
					competency,
					[]
				);
				//if (competencies[label].positives.length > 0)
				await this.processAssertionsBooleanPerAssertion(
					competencies[label].positives,
					false,
					competency,
					[]
				);
			})
		)
		if (success != null)
			success();
	}
	async processAssertionsBooleanPerAssertion(
		assertions,
		negative,
		competency,
		visited
	) {
		if (EcArray.has(visited, competency)) {
			return;
		}
		visited.push(competency);
		if (negative) {
			let msc = this.getMetaStateCompetency(competency);
			for (let assertion of assertions) {
				if (visited.length > 1 && assertion.registration && msc.positiveAssertion?.some(a => a.registration == assertion.registration))
					continue;
				if (visited.length > 1 && assertion.registration && msc.negativeAssertion?.some(a => a.registration == assertion.registration))
					continue;
				this.addToMetaStateArray(
					msc,
					"negativeAssertion",
					assertion
				);
			}
			await Promise.all(
				this.getOutEdges(competency).map(async (alignment) =>
					await this.getCompetency(alignment.target).then(async (t) =>
						await this.processAssertionBooleanOutward(
							alignment,
							t,
							assertions,
							negative,
							visited
						)
					)
				)
			).then(async () =>
				await Promise.all(
					this.getInEdges(competency).map(async (alignment) =>
						await this.getCompetency(alignment.source).then(async (s) =>
							await this.processAssertionBooleanInward(
								alignment,
								s,
								assertions,
								negative,
								visited
							)
						)
					)
				)
			);
		} else {
			let msc = this.getMetaStateCompetency(competency);
			for (let assertion of assertions) {
				if (visited.length > 1 && assertion.registration && msc.positiveAssertion?.some(a => a.registration == assertion.registration))
					continue;
				if (visited.length > 1 && assertion.registration && msc.negativeAssertion?.some(a => a.registration == assertion.registration))
					continue;
				this.addToMetaStateArray(
					msc,
					"positiveAssertion",
					assertion
				);
			}
			await Promise.all(
				this.getInEdges(competency).map(async (alignment) =>
					await this.getCompetency(alignment.source).then(async (t) =>
						await this.processAssertionBooleanOutward(
							alignment,
							t,
							assertions,
							negative,
							visited
						)
					)
				)
			).then(async () =>
				await Promise.all(
					this.getOutEdges(competency).map(async (alignment) =>
						await this.getCompetency(alignment.target).then(
							alignment.relationType == Relation.IMPLIES
								? async (t) =>
									await this.processAssertionBooleanOutward(
										alignment,
										t,
										assertions,
										negative,
										visited
									) : async (s) =>
									await this.processAssertionBooleanInward(
										alignment,
										s,
										assertions,
										negative,
										visited
									)
						)
					)
				)
			);
		}
	}
	async processAssertionBooleanOutward(
		alignment,
		c,
		assertions,
		negative,
		visited
	) {
		if (alignment.relationType == Relation.NARROWS || alignment.relationType == Relation.IS_EQUIVALENT_TO || alignment.relationType == Relation.IMPLIES)
			await this.processAssertionsBooleanPerAssertion(
				assertions,
				negative,
				c,
				visited
			);
	}
	async processAssertionBooleanInward(
		alignment,
		c,
		assertions,
		negative,
		visited
	) {
		if (alignment.relationType == Relation.REQUIRES || alignment.relationType == Relation.IS_EQUIVALENT_TO)
			await this.processAssertionsBooleanPerAssertion(
				assertions,
				negative,
				c,
				visited
			);
	}
	addToMetaStateArray(metaState, key, value)  {
            if (metaState == null) return;
            if (metaState[key] == null) metaState[key] = [];
            if (metaState[key].some(e => e.shortId() == value.shortId())) return;
            metaState[key].push(value);
        }
	/**
	 *  Fetches the Meta Competency (additional state information used to compute profiles or other data) for a competency.
	 *
	 *  @param {EcCompetency} c Competency to fetch meta state for.
	 *  @return Meta state (empty object by default)
	 *  @method getMetaStateCompetency
	 *  @memberOf EcFrameworkGraph
	 */
	getMetaStateCompetency(c) {
		let result = this.metaVerticies[c.shortId()];
		if (result === undefined || result == null) {
			if (!this.containsVertex(c)) return null;
			if (this.metaVerticies[c.shortId()] == null)
				this.metaVerticies[c.shortId()] = result = {};
		}
		return result;
	}
	getMetaStateAlignment(a) {
		let result = this.metaEdges[a.shortId()];
		if (result == null) {
			if (!this.containsEdge(a)) return null;
			if (this.metaEdges[a.shortId()] == null)
				this.metaEdges[a.shortId()] = result = {};
		}
		return result;
	}
	containsVertex(competency) {
		return this.competencyMap[competency.shortId()] != null;
	}
	containsVertexById(id) {
		return this.containsVertexByShortId(
			EcRemoteLinkedData.trimVersionFromUrl(id)
		);
	}
	containsVertexByShortId(shortId) {
		return this.competencyMap[shortId] !== undefined && this.competencyMap[shortId] != null;
	}
	containsEdge(alignment) {
		return this.edgeMap[alignment.shortId()] != null;
	}
	async getCompetency(competencyId) {
		let c = null;
		c = this.competencyMap[competencyId];
		if (c == null) c = await EcCompetency.get(competencyId, null, null, this.repo, this.eim);
		return c;
	}
	getCompetencySoft(competencyId) {
		let c = null;
		c = this.competencyMap[competencyId];
		return c;
	}
	addCompetency(competency) {
		if (competency == null) return false;
		if (this.containsVertex(competency)) return false;
		this.competencyMap[competency.shortId()] = competency;
		this.competencyMap[competency.id] = competency;
		return this.addVertex(competency);
	}
	async addRelation(alignment) {
		if (alignment == null) return false;
		if (this.containsEdge(alignment)) return false;
		this.edgeMap[alignment.shortId()] = alignment;
		let source = this.competencyMap[
			EcRemoteLinkedData.trimVersionFromUrl(alignment.source)
		];
		if (source == null && this.dontTryAnyMore[alignment.source] != null)
			return false;
		if (source == null) source = await this.getCompetency(alignment.source);
		if (source == null) this.dontTryAnyMore[alignment.source] = "";
		let target = this.competencyMap[alignment.target];
		if (target == null && this.dontTryAnyMore[alignment.target] != null)
			return false;
		if (target == null) target = await this.getCompetency(alignment.target);
		if (target == null) this.dontTryAnyMore[alignment.target] = "";
		if (source == null || target == null) return false;
		return this.addEdgeUnsafely(alignment, source, target);
	}
	addHyperEdge(edge, vertices) {
		throw new Error("Don't do this.");
	}
	getEdgeType(edge) {
		return edge.relationType;
	}
	getDefaultEdgeType() {
		return EcAlignment.NARROWS;
	}
	inEdgeCache = {};
	outEdgeCache = {};
	getInEdges(vertex) {
		if (this.inEdgeCache[vertex.shortId()] == null) return [];
		return [...this.inEdgeCache[vertex.shortId()]];
	}
	getOutEdges(vertex) {
		if (this.outEdgeCache[vertex.shortId()] == null) return [];
		return [...this.outEdgeCache[vertex.shortId()]];
	}
	addEdge(e, v1, v2) {
		this.addVertexSafely(v1);
		this.addVertexSafely(v2);
		let t = new Triple();
		t.source = v1;
		t.destination = v2;
		t.edge = e;
		this.edges.push(t);
		this.cacheEdges(t);
		return true;
	}
	addEdgeUnsafely(e, v1, v2) {
		let t = new Triple();
		t.source = v1;
		t.destination = v2;
		t.edge = e;
		this.edges.push(t);
		this.cacheEdges(t);
		return true;
	}
	addEdgeSafely(e, v1, v2) {
		this.addVertexSafely(v1);
		this.addVertexSafely(v2);
		let t = new Triple();
		t.source = v1;
		t.destination = v2;
		t.edge = e;
		if (EcArray.has(this.edges, t)) return false;
		this.edges.push(t);
		this.cacheEdges(t);
		return true;
	}
	removeVertex(vertex) {
		delete this.inEdgeCache[vertex.shortId()];
		delete this.outEdgeCache[vertex.shortId()];
		return super.removeVertex(vertex);
	}
	cacheEdges(e) {
		if (this.inEdgeCache[e.destination.shortId()] == null)
			this.inEdgeCache[e.destination.shortId()] = [];
		this.inEdgeCache[e.destination.shortId()].push(e.edge);
		if (this.outEdgeCache[e.source.shortId()] == null)
			this.outEdgeCache[e.source.shortId()] = [];
		this.outEdgeCache[e.source.shortId()].push(e.edge);
	}
};