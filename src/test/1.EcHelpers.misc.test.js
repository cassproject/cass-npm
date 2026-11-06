require("../../index.js");
const { expect } = require("chai");
const sinon = require("sinon");
const EcArray = require("../com/eduworks/ec/array/EcArray.js");
const EcObject = require("../com/eduworks/ec/array/EcObject.js");
const EcAsyncHelper = require("../com/eduworks/ec/array/EcAsyncHelper.js");
const helpers = require("../com/eduworks/ec/promises/helpers.js");
const EcDirectedGraph = require("../com/eduworks/ec/graph/EcDirectedGraph.js");
const EcFrameworkGraph = require("../com/eduworks/ec/graph/EcFrameworkGraph.js");
const EcAsyncTask = require("../com/eduworks/ec/task/EcAsyncTask.js");
const EcAsyncTaskManager = require("../com/eduworks/ec/task/EcAsyncTaskManager.js");
const EcAsyncTaskWorker = require("../com/eduworks/ec/task/EcAsyncTaskWorker.js");
const Task = require("../com/eduworks/ec/task/Task.js");

describe("Helper classes (pinned behaviour)", () => {
	describe("EcArray.isArray / EcObject.isObject type tags", () => {
		it("classifies values by their Object.prototype.toString tag", () => {
			expect(EcArray.isArray([])).to.equal(true);
			expect(EcArray.isArray(new Array(3))).to.equal(true);
			expect(EcArray.isArray({ length: 0 })).to.equal(false);
			expect(EcArray.isArray(null)).to.equal(false);
			expect(EcArray.isArray(undefined)).to.equal(false);
			expect(EcArray.isArray("[]")).to.equal(false);
			expect(EcObject.isObject({})).to.equal(true);
			expect(EcObject.isObject([])).to.equal(false);
			expect(EcObject.isObject(null)).to.equal(false);
			expect(EcObject.isObject(undefined)).to.equal(false);
			expect(EcObject.isObject("x")).to.equal(false);
			expect(EcObject.isObject(new Date())).to.equal(true);
		});
	});

	describe("EcAsyncHelper.eachSet", () => {
		it("replaces values and drops falsy results before calling after", (done) => {
			let arr = [1, 2, 3, 4, 5];
			let results = { 1: "a", 2: 0, 3: null, 4: "", 5: "e" };
			new EcAsyncHelper().eachSet(arr, (item, cb) => cb(results[item]), (out) => {
				try {
					expect(out).to.deep.equal(["a", "e"]);
					expect(arr).to.deep.equal(["a", 0, null, "", "e"]);
					done();
				} catch (e) {
					done(e);
				}
			});
		});
		it("calls after immediately with the same array when empty", () => {
			let arr = [];
			let got = null;
			new EcAsyncHelper().eachSet(arr, () => { }, (out) => got = out);
			expect(got).to.equal(arr);
		});
	});

	describe("promises/helpers", () => {
		it("cassReturnNullAsPromise resolves null", async () => {
			expect(await helpers.cassReturnNullAsPromise()).to.equal(null);
		});
		it("cassReturnNullAsPromise passes null to success and returns its result", async () => {
			let success = sinon.stub().returns("ok");
			let failure = sinon.spy();
			expect(await helpers.cassReturnNullAsPromise(success, failure)).to.equal("ok");
			expect(success.calledOnceWithExactly(null)).to.equal(true);
			expect(failure.called).to.equal(false);
		});
		it("cassReturnNullAsPromise with only failure resolves null", async () => {
			let failure = sinon.spy();
			expect(await helpers.cassReturnNullAsPromise(null, failure)).to.equal(null);
			expect(failure.called).to.equal(false);
		});
		it("cassReturnNullAsPromise resolves asynchronously", () => {
			let success = sinon.spy();
			helpers.cassReturnNullAsPromise(success);
			expect(success.called).to.equal(false);
		});
	});

	describe("EcDirectedGraph.getIncidentVertices", () => {
		it("returns source then destination, de-duplicated", () => {
			let graph = new EcDirectedGraph();
			let v1 = { equals: (v) => v === v1 };
			let v2 = { equals: (v) => v === v2 };
			let e1 = { equals: (e) => e === e1 };
			let e2 = { equals: (e) => e === e2 };
			graph.addEdge(e1, v2, v1);
			graph.addEdge(e2, v1, v1);
			expect(graph.getIncidentVertices(e1)).to.deep.equal([v2, v1]);
			expect(graph.getIncidentVertices(e2)).to.deep.equal([v1]);
			expect(graph.getIncidentVertices({ equals: () => false })).to.deep.equal([]);
		});
	});

	describe("EcFrameworkGraph.processAssertionsBooleanPerAssertion", () => {
		let graph, msc, comp;
		let mkAssertion = (id, registration) => ({ shortId: () => id, registration });
		beforeEach(() => {
			graph = new EcFrameworkGraph();
			msc = {};
			comp = { shortId: () => "c1", equals: (o) => o === comp };
			sinon.stub(graph, "getMetaStateCompetency").returns(msc);
			sinon.stub(graph, "getOutEdges").returns([]);
			sinon.stub(graph, "getInEdges").returns([]);
		});
		afterEach(() => sinon.restore());

		it("returns early if the competency was already visited", async () => {
			let visited = [comp];
			await graph.processAssertionsBooleanPerAssertion([mkAssertion("a")], true, comp, visited);
			expect(visited).to.deep.equal([comp]);
			expect(graph.getMetaStateCompetency.called).to.equal(false);
		});
		for (let negative of [true, false]) {
			let field = negative ? "negativeAssertion" : "positiveAssertion";
			it(`adds assertions to ${field} on the first visit, regardless of registration`, async () => {
				msc.positiveAssertion = [mkAssertion("p", "r1")];
				msc.negativeAssertion = [mkAssertion("n", "r2")];
				let visited = [];
				await graph.processAssertionsBooleanPerAssertion(
					[mkAssertion("a", "r1"), mkAssertion("b", "r2"), mkAssertion("a")],
					negative, comp, visited);
				expect(visited).to.deep.equal([comp]);
				expect(msc[field].map((a) => a.shortId())).to.deep.equal(negative ? ["n", "a", "b"] : ["p", "a", "b"]);
			});
			it(`skips ${field} assertions whose registration is already present when propagated`, async () => {
				msc.positiveAssertion = [mkAssertion("p", "r1")];
				msc.negativeAssertion = [mkAssertion("n", "r2")];
				let visited = [{ equals: () => false }];
				await graph.processAssertionsBooleanPerAssertion(
					[mkAssertion("a", "r1"), mkAssertion("b", "r2"), mkAssertion("c", "r3"), mkAssertion("d", "r3"), mkAssertion("e")],
					negative, comp, visited);
				// "d" is skipped because "c" (same registration) was added to the array earlier in the loop.
				let expected = negative ? ["n", "c", "e"] : ["p", "c", "e"];
				expect(msc[field].map((a) => a.shortId())).to.deep.equal(expected);
			});
			it(`tolerates a null meta state (${field})`, async () => {
				graph.getMetaStateCompetency.returns(null);
				await graph.processAssertionsBooleanPerAssertion([mkAssertion("a", "r1")], negative, comp, [{ equals: () => false }]);
			});
		}
		it("negative: propagates outward over out-edges, then inward over in-edges", async () => {
			let calls = [];
			let target = { id: "t" }, source = { id: "s" };
			graph.getOutEdges.returns([{ target: "T" }]);
			graph.getInEdges.returns([{ source: "S" }]);
			sinon.stub(graph, "getCompetency").callsFake(async (id) => id == "T" ? target : source);
			sinon.stub(graph, "processAssertionBooleanOutward").callsFake(async (al, c) => calls.push(["out", al, c]));
			sinon.stub(graph, "processAssertionBooleanInward").callsFake(async (al, c) => calls.push(["in", al, c]));
			await graph.processAssertionsBooleanPerAssertion([], true, comp, []);
			expect(calls).to.deep.equal([["out", { target: "T" }, target], ["in", { source: "S" }, source]]);
		});
		it("positive: in-edges outward first, then out-edges outward for IMPLIES and inward otherwise", async () => {
			let calls = [];
			graph.getInEdges.returns([{ source: "S" }]);
			graph.getOutEdges.returns([{ target: "T1", relationType: Relation.IMPLIES }, { target: "T2", relationType: Relation.NARROWS }]);
			sinon.stub(graph, "getCompetency").callsFake(async (id) => ({ id }));
			sinon.stub(graph, "processAssertionBooleanOutward").callsFake(async (al, c, as, neg) => calls.push(["out", c.id, neg]));
			sinon.stub(graph, "processAssertionBooleanInward").callsFake(async (al, c, as, neg) => calls.push(["in", c.id, neg]));
			await graph.processAssertionsBooleanPerAssertion([], false, comp, []);
			expect(calls).to.deep.equal([["out", "S", false], ["out", "T1", false], ["in", "T2", false]]);
		});
	});

	describe("EcAsyncTask", () => {
		for (let n = 0; n <= 4; n++) {
			it(`invoke${n} passes ${n} arguments plus a completion callback, with this = task`, () => {
				let seen = null;
				let task = new EcAsyncTask(function (...args) {
					seen = { self: this, args };
					return "ret" + n;
				});
				let args = [1, 2, 3, 4].slice(0, n);
				expect(task.doTask(...args)).to.equal("ret" + n);
				expect(seen.self).to.equal(task);
				expect(seen.args.slice(0, n)).to.deep.equal(args);
				expect(seen.args.length).to.equal(n + 1);
				expect(task.getIsStarted()).to.equal(true);
				expect(task.getIsComplete()).to.equal(false);
				seen.args[n].call({});
				expect(task.getIsComplete()).to.equal(true);
				expect(task.stop).to.be.instanceOf(Date);
			});
		}
		it("doTask runs only once and returns undefined for more than 4 arguments", () => {
			let job = sinon.stub().returns(1);
			let task = new EcAsyncTask(job);
			expect(task.doTask(1, 2, 3, 4, 5)).to.equal(undefined);
			expect(job.called).to.equal(false);
			expect(task.doTask()).to.equal(undefined);
		});
		it("constructor collects non-null params (param3 is guarded by param2)", () => {
			expect(new EcAsyncTask(null, 1, 2, 3, 4).getArguments()).to.deep.equal([1, 2, 3, 4]);
			expect(new EcAsyncTask(null, 1, null, 3, null).getArguments()).to.deep.equal([1]);
		});
	});

	describe("EcAsyncTaskManager / EcAsyncTaskWorker", () => {
		let clock, savedLastFrame, savedHandle;
		beforeEach(() => {
			savedLastFrame = Task.lastFrame;
			savedHandle = Task.updateFrameHandle;
			clock = sinon.useFakeTimers({ now: 1000000 });
		});
		afterEach(() => {
			clock.restore();
			Task.lastFrame = savedLastFrame;
			Task.updateFrameHandle = savedHandle;
		});
		it("runs assigned tasks on the worker interval and cleans them up", () => {
			let ran = [];
			let mgr = new EcAsyncTaskManager(1);
			expect(mgr.workerList.length).to.equal(1);
			let t1 = new EcAsyncTask(function (a, done) { ran.push(a); done(); }, "x");
			let t2 = new EcAsyncTask(function (a, b, done) { ran.push(a + b); done(); }, "y", "z");
			let ret = mgr.addTasks([t1, t2]);
			expect(Object.values(ret)).to.deep.equal([t1, t2]);
			expect(mgr.workerList[0].currentTask).to.equal(t1);
			expect(mgr.workerList[0].assignedList).to.deep.equal([t2]);
			Task.lastFrame = Date.now();
			clock.tick(100);
			expect(ran).to.deep.equal(["x"]);
			expect(mgr.workerList[0].currentTask).to.equal(t2);
			clock.tick(100);
			expect(ran).to.deep.equal(["x", "yz"]);
			clock.tick(2500);
			expect(Object.keys(mgr.taskMap)).to.deep.equal([]);
		});
		it("cleanupTasks completes started tasks that exceeded their timeout", () => {
			let mgr = new EcAsyncTaskManager(0);
			let task = new EcAsyncTask(function () { });
			task.setTimeout(5);
			mgr.addTask(task);
			task.doTask();
			expect(task.getIsComplete()).to.equal(false);
			clock.tick(5000);
			mgr.cleanupTasks();
			expect(Object.keys(mgr.taskMap).length).to.equal(1);
			expect(task.getIsComplete()).to.equal(false);
			clock.tick(1);
			mgr.cleanupTasks();
			expect(task.getIsComplete()).to.equal(true);
			expect(Object.keys(mgr.taskMap).length).to.equal(0);
		});
		it("the manager's interval calls cleanupTasks on itself", () => {
			let mgr = new EcAsyncTaskManager(0);
			let spy = sinon.spy(mgr, "cleanupTasks");
			clock.tick(2500);
			expect(spy.calledOnce).to.equal(true);
			expect(spy.firstCall.thisValue).to.equal(mgr);
		});
		it("the worker's interval calls run on itself", () => {
			let worker = new EcAsyncTaskWorker();
			let spy = sinon.spy(worker, "run");
			clock.tick(100);
			expect(spy.calledOnce).to.equal(true);
			expect(spy.firstCall.thisValue).to.equal(worker);
			clearInterval(worker.intervalHandler);
		});
	});
});
