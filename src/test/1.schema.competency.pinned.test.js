require("../../index.js");
const { expect } = require("chai");
const sinon = require("sinon");

const Cass = require("../org/cassproject/schema/cass/Cass.js");
const General = require("../org/cassproject/schema/general/General.js");
const EcRepository = require("../org/cassproject/ebac/repository/EcRepository.js");

const versioned = [
	["Competency", () => Competency, 6],
	["Framework", () => Framework, 6],
	["Level", () => Level, 6],
	["Relation", () => Relation, 6],
	["Assertion", () => Assertion, 6],
];

describe("Schema classes (pinned getTypes / upgrade)", () => {
	describe("getTypes", () => {
		for (let [name, cls, max] of versioned) {
			it(`${name}.getTypes returns TYPE_0_6 .. TYPE_0_1, newest first, in a fresh array`, () => {
				let C = cls();
				let expected = [];
				for (let i = max; i >= 1; i--) expected.push(C["TYPE_0_" + i]);
				let o = new C();
				let a = o.getTypes();
				expect(a).to.deep.equal(expected);
				expect(o.getTypes()).to.not.equal(a);
			});
		}
		it("RollupRule.getTypes returns TYPE_0_6 .. TYPE_0_2", () => {
			expect(new RollupRule().getTypes()).to.deep.equal([
				RollupRule.TYPE_0_6, RollupRule.TYPE_0_5, RollupRule.TYPE_0_4, RollupRule.TYPE_0_3, RollupRule.TYPE_0_2
			]);
		});
		it("Concept / ConceptScheme getTypes return TYPE_0_3 .. TYPE_0_1", () => {
			expect(new Concept().getTypes()).to.deep.equal([Concept.TYPE_0_3, Concept.TYPE_0_2, Concept.TYPE_0_1]);
			expect(new ConceptScheme().getTypes()).to.deep.equal([ConceptScheme.TYPE_0_3, ConceptScheme.TYPE_0_2, ConceptScheme.TYPE_0_1]);
		});
		it("GeneralFile.getTypes returns TYPE_0_2, TYPE_0_1", () => {
			expect(new GeneralFile().getTypes()).to.deep.equal([GeneralFile.TYPE_0_2, GeneralFile.TYPE_0_1]);
		});
	});

	describe("upgrade from 0.1", () => {
		let cases = [
			["Competency", () => Competency, Cass.context_0_1, Cass.context_0_6],
			["Framework", () => Framework, Cass.context_0_1, Cass.context_0_6],
			["Level", () => Level, Cass.context_0_1, Cass.context_0_6],
			["Relation", () => Relation, Cass.context_0_1, Cass.context_0_6],
			["Assertion", () => Assertion, Cass.context_0_1, Cass.context_0_6],
			["GeneralFile", () => GeneralFile, General.context_0_1, General.context_0_2],
		];
		for (let [name, cls, oldCtx, newCtx] of cases) {
			it(`${name}: copies @schema into @context when @context is missing`, () => {
				let C = cls();
				let o = new C();
				o.context = oldCtx;
				o.type = C.TYPE_0_1;
				o["@schema"] = "SCHEMA";
				o.upgrade();
				expect(o["@context"]).to.equal("SCHEMA");
				expect(o.context).to.equal(newCtx);
				expect(o.getFullType()).to.equal(C.myType);
				let fresh = new C();
				expect(o.type).to.equal(fresh.type);
			});
			it(`${name}: keeps an existing @context and ignores a missing @schema`, () => {
				let C = cls();
				let o = new C();
				o.type = C.TYPE_0_1;
				o["@context"] = "CTX";
				o["@schema"] = "SCHEMA";
				o.upgrade();
				expect(o["@context"]).to.equal("CTX");
				let p = new C();
				p.type = C.TYPE_0_1;
				p.upgrade();
				expect(p["@context"]).to.equal(undefined);
				expect(p.getFullType()).to.equal(C.myType);
			});
		}
		it("Competency: moves url to sameAs only if sameAs is unset", () => {
			let o = new Competency();
			o.type = Competency.TYPE_0_1;
			o.url = "http://u";
			o.upgrade();
			expect(o.sameAs).to.equal("http://u");
			expect(o.url).to.equal(null);
			let p = new Competency();
			p.type = Competency.TYPE_0_1;
			p.url = "http://u";
			p.sameAs = "http://s";
			p.upgrade();
			expect(p.sameAs).to.equal("http://s");
			expect(p.url).to.equal("http://u");
		});
		it("Relation: fixes the isEquivalenTo typo", () => {
			let o = new Relation();
			o.relationType = "isEquivalenTo";
			o.upgrade();
			expect(o.relationType).to.equal(Relation.IS_EQUIVALENT_TO);
		});
		it("RollupRule: upgrades from 0.2", () => {
			let o = new RollupRule();
			o.setContextAndType(Cass.context_0_2, RollupRule.TYPE_0_2);
			o.upgrade();
			expect(o.getFullType()).to.equal(RollupRule.TYPE_0_6);
			expect(o.context).to.equal(Cass.context_0_6);
		});
		it("upgrade from the serialised 0.1 form via copyFrom", () => {
			let o = new Competency().copyFrom({
				"@context": Cass.context_0_1,
				"@type": Competency.TYPE_0_1,
				"@id": "http://x/1",
				url: "http://u",
			});
			expect(o.getFullType()).to.equal(Competency.TYPE_0_6);
			expect(o.sameAs).to.equal("http://u");
			expect(o.url).to.equal(null);
		});
	});

	describe("Ec* constructors apply the class template", () => {
		let classes = [
			["EcCompetency", () => EcCompetency],
			["EcFramework", () => EcFramework],
			["EcDirectory", () => EcDirectory],
			["EcConcept", () => EcConcept],
			["EcConceptScheme", () => EcConceptScheme],
		];
		for (let [name, cls] of classes) {
			it(`${name}: copies non-function template values, stripping the first @`, () => {
				let C = cls();
				let saved = C.template;
				try {
					C.template = { "@foo": "bar", "x@@y": 1, fn: () => 1, name: "templated" };
					let o = new C();
					expect(o.foo).to.equal("bar");
					expect(o["x@y"]).to.equal(1);
					expect(o.fn).to.equal(undefined);
					expect(o.name).to.equal("templated");
					C.template = null;
					expect(new C().foo).to.equal(undefined);
				} finally {
					C.template = saved;
				}
			});
		}
	});

	describe("Assertion", () => {
		afterEach(() => sinon.restore());
		let pk = (pem) => ({ toPem: () => pem });
		it("setSubject sets the subject pem and pushes it into reader when no subject readers exist", () => {
			let a = new Assertion();
			a.reader = ["r1"];
			let readers = a.reader;
			a.owner = ["o1"];
			a.setSubject(pk("PEM"));
			expect(a.subject).to.equal("PEM");
			expect(readers).to.deep.equal(["r1", "PEM"]);
			let b = new Assertion();
			b.setSubject(pk("PEM2"));
			expect(b.subject).to.equal("PEM2");
			expect(b.reader).to.equal(null);
		});
		it("setSubject does not mutate reader when the previous subject had readers", () => {
			let a = new Assertion();
			a.reader = ["r1"];
			a.subject = { owner: ["so"], reader: ["sr"] };
			a.setSubject(pk("PEM"));
			expect(a.reader).to.deep.equal(["r1"]);
			expect(a.subject).to.equal("PEM");
			let b = new Assertion();
			b.reader = ["r1"];
			b.subject = { owner: ["so"] };
			b.setSubject(pk("PEM"));
			expect(b.reader).to.deep.equal(["r1", "PEM"]);
		});
		let eim = (identity, contact) => ({
			getIdentity: sinon.stub().returns(identity),
			getContact: sinon.stub().returns(contact),
		});
		let nameCases = [
			[null, null, "Unknown"],
			[{}, null, "Unknown"],
			[{ displayName: "Me" }, null, "Me (You)"],
			[null, {}, "Unknown"],
			[null, { displayName: "Them" }, "Them"],
			[{}, { displayName: "Them" }, "Them"],
			[{ displayName: "Me" }, { displayName: "Them" }, "Me (You)"],
		];
		for (let [identity, contact, expected] of nameCases) {
			let label = JSON.stringify([identity, contact]);
			it(`getSubjectName / getAgentName ${label}`, () => {
				let a = new Assertion();
				a.subject = "S";
				a.agent = "A";
				sinon.stub(a, "getSubject").returns("SPK");
				sinon.stub(a, "getAgent").returns("APK");
				let e = eim(identity, contact);
				expect(a.getSubjectName(e)).to.equal(expected == "Unknown" ? "Unknown Subject" : expected);
				expect(e.getIdentity.firstCall.args[0]).to.equal("SPK");
				expect(a.getAgentName(e)).to.equal(expected == "Unknown" ? "Unknown Agent" : expected);
				expect(e.getIdentity.secondCall.args[0]).to.equal("APK");
			});
			it(`getSubjectNameAsync / getAgentNameAsync ${label}`, () => {
				let a = new Assertion();
				a.subject = "S";
				a.agent = "A";
				sinon.stub(a, "getSubjectAsync").callsFake((s) => s("SPK"));
				sinon.stub(a, "getAgentAsync").callsFake((s) => s("APK"));
				let e = eim(identity, contact);
				let success = sinon.spy();
				a.getSubjectNameAsync(success, null, e);
				a.getAgentNameAsync(success, null, e);
				expect(success.args).to.deep.equal([
					[expected == "Unknown" ? "Unknown Subject" : expected],
					[expected == "Unknown" ? "Unknown Agent" : expected],
				]);
			});
		}
		it("name lookups return Nobody without a subject/agent (agent async checks subject)", () => {
			let a = new Assertion();
			let e = eim(null, null);
			expect(a.getSubjectName(e)).to.equal("Nobody");
			expect(a.getAgentName(e)).to.equal("Nobody");
			let success = sinon.spy();
			a.getSubjectNameAsync(success, null, e);
			a.getAgentNameAsync(success, null, e);
			expect(success.args).to.deep.equal([["Nobody"], ["Nobody"]]);
		});
		it("upgrade revives encrypted fields and every evidence entry", () => {
			let a = new Assertion();
			let enc = (payload) => {
				let v = new EcEncryptedValue();
				v.payload = payload;
				return JSON.parse(v.toJson());
			};
			a.evidence = [enc("p1"), enc("p2")];
			a.agent = enc("a");
			a.upgrade();
			expect(a.agent).to.be.instanceOf(EcEncryptedValue);
			expect(a.evidence[0]).to.be.instanceOf(EcEncryptedValue);
			expect(a.evidence[0].payload).to.equal("p1");
			expect(a.evidence[1]).to.be.instanceOf(EcEncryptedValue);
			expect(a.evidence[1].payload).to.equal("p2");
			let b = new Assertion();
			b.upgrade();
			expect(b.evidence).to.equal(null);
		});
	});

	describe("AssertionEnvelope", () => {
		let ev = (v) => ({ decryptSecret: sinon.stub().resolves(v) });
		it("addAssertion records the decrypted secrets in a codebook", async () => {
			let env = new AssertionEnvelope();
			let eim = {};
			let a = {
				shortId: () => "sid",
				agent: ev("ag"), subject: ev("su"), assertionDate: ev("ad"), expirationDate: ev("ed"),
				decayFunction: ev("df"), negative: ev("ne"),
				evidence: [ev("e1"), ev("e2")],
			};
			await env.addAssertion(a, eim);
			expect(env.assertion).to.deep.equal([a]);
			let cb = env.codebook[0];
			expect(cb).to.be.instanceOf(AssertionCodebook);
			expect(cb.assertionShortId).to.equal("sid");
			expect([cb.agent, cb.subject, cb.assertionDate, cb.expirationDate, cb.decayFunction, cb.negative])
				.to.deep.equal(["ag", "su", "ad", "ed", "df", "ne"]);
			expect(cb.evidence).to.deep.equal(["e1", "e2"]);
			expect(a.evidence[1].decryptSecret.calledWith(eim)).to.equal(true);
		});
		it("addAssertion with no encrypted fields and empty evidence", async () => {
			let env = new AssertionEnvelope();
			await env.addAssertion({ shortId: () => null, evidence: [] });
			let cb = env.codebook[0];
			expect(cb.assertionShortId == null).to.equal(true);
			expect(cb.agent == null).to.equal(true);
			expect(cb.evidence == null).to.equal(true);
			await env.addAssertion({ shortId: () => "b" });
			expect(env.assertion.length).to.equal(2);
			expect(env.codebook.length).to.equal(2);
		});
		it("validate returns false if any assertion is invalid", () => {
			let env = new AssertionEnvelope();
			expect(env.validate()).to.equal(true);
			env.assertion = [{ invalid: () => false }, { invalid: () => false }];
			expect(env.validate()).to.equal(true);
			let third = { invalid: sinon.stub().returns(false) };
			env.assertion = [{ invalid: () => false }, { invalid: () => true }, third];
			expect(env.validate()).to.equal(false);
			expect(third.invalid.called).to.equal(false);
		});
	});

	describe("EcFramework relationship/level removal", () => {
		afterEach(() => sinon.restore());
		it("removeRelationshipsThatInclude removes matching relations and then calls success", async () => {
			let f = new EcFramework();
			f.relation = ["r1", "r2", "r3", "r4"];
			let rels = {
				r1: { source: "http://x/api/data/c/1", target: "x" },
				r2: { source: "y", target: "z" },
				r3: { source: "y", target: "http://x/api/data/c/1/123" },
				r4: null,
			};
			sinon.stub(EcAlignment, "get").callsFake(async (id, s, fail) => {
				if (id == "r4") return fail("missing");
				return s(rels[id]);
			});
			let success = sinon.spy();
			await f.removeRelationshipsThatInclude("http://x/api/data/c/1/123", 0, success, null);
			expect(f.relation).to.deep.equal(["r2", "r4"]);
			expect(success.calledOnceWithExactly("")).to.equal(true);
		});
		it("removeLevelsThatInclude removes matching levels and then calls success", async () => {
			let f = new EcFramework();
			f.level = ["l1", "l2", "l3"];
			let levels = { l1: { competency: "http://c/1" }, l2: { competency: "http://c/2" }, l3: null };
			sinon.stub(EcLevel, "get").callsFake(async (id, s, fail) => {
				if (id == "l3") return fail("missing");
				return s(levels[id]);
			});
			let success = sinon.spy();
			await f.removeLevelsThatInclude("http://c/1", 0, success, null);
			expect(f.level).to.deep.equal(["l2", "l3"]);
			expect(success.calledOnceWithExactly("")).to.equal(true);
		});
	});

	describe("CfdFramework._delete", () => {
		afterEach(() => sinon.restore());
		it("deletes the framework once every competency and relation was processed", () => {
			let f = new CfdFramework();
			f.id = "http://f/1";
			f.competency = ["c1", "c2"];
			f.relation = ["r1", "r2"];
			let del = sinon.stub(EcRepository, "DELETE");
			sinon.stub(CfdCompetency, "get").callsFake((id, s, fail) => {
				if (id == "c1") s({ id, _delete: (ok) => ok() });
				else s({ id, _delete: (ok, ko) => ko("nope") });
			});
			sinon.stub(EcAlignment, "get").callsFake((id, s, fail) => {
				if (id == "r1") s({ id, _delete: (ok) => ok() });
				else fail("gone");
			});
			let success = () => { }, failure = sinon.spy();
			f._delete(success, failure, "REPO", "EIM");
			expect(failure.args).to.deep.equal([
				["Error deleting competency (c2): nope"],
				["Error retrieving relationship to delete: gone"],
			]);
			// Pinned: when every callback fires synchronously the framework is DELETEd twice.
			expect(del.callCount).to.equal(2);
			expect(del.firstCall.args).to.deep.equal([f, success, failure, "REPO", "EIM"]);
			expect(CfdFramework.removed[f.shortId()]).to.equal(4);
			expect(CfdFramework.toRemove[f.shortId()]).to.equal(4);
		});
		it("deletes immediately (twice) when there is nothing to remove", () => {
			let f = new CfdFramework();
			f.id = "http://f/2";
			let del = sinon.stub(EcRepository, "DELETE");
			f._delete(null, null);
			expect(del.callCount).to.equal(2);
		});
		it("waits for async callbacks before deleting", () => {
			let f = new CfdFramework();
			f.id = "http://f/3";
			f.competency = ["c1"];
			let del = sinon.stub(EcRepository, "DELETE");
			let pending = null;
			sinon.stub(CfdCompetency, "get").callsFake((id, s, fail) => { pending = fail; });
			let failure = sinon.spy();
			f._delete(null, failure);
			expect(del.called).to.equal(false);
			pending("x");
			expect(failure.args).to.deep.equal([["Error retrieving competency to delete: x"]]);
			expect(del.calledOnce).to.equal(true);
			expect(del.firstCall.args[0]).to.equal(f);
		});
	});
});
