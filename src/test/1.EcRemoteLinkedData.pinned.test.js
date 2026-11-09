require("../../index.js");
const { expect } = require("chai");
const sinon = require("sinon");
const EcCrypto = require("../com/eduworks/ec/crypto/EcCrypto.js");
const EcPk = require("../com/eduworks/ec/crypto/EcPk.js");
const EcPpk = require("../com/eduworks/ec/crypto/EcPpk.js");
const EcRsaOaepAsyncWorker = require("../com/eduworks/ec/crypto/EcRsaOaepAsyncWorker.js");

describe("EcRemoteLinkedData / EcLinkedData (pinned behaviour)", () => {
	afterEach(() => sinon.restore());

	describe("trimVersionFromUrl", () => {
		let saved;
		beforeEach(() => {
			saved = EcRemoteLinkedData.caching;
		});
		afterEach(() => {
			EcRemoteLinkedData.caching = saved;
			EcRemoteLinkedData.tvfuCache = {};
		});
		let cases = [
			[null, null],
			["http://x/api/data/a.b/guid/123", "http://x/api/data/a.b/guid"],
			["http://x/api/custom/data/a/guid/123", "http://x/api/custom/data/a/guid"],
			["http://x/api/data/a/guid", "http://x/api/data/a/guid"],
			["http://x/api/data/a/guid/12a", "http://x/api/data/a/guid/12a"],
			["http://x/api/data/a//123", "http://x/api/data/a"],
			["http://x/other/guid/123", "http://x/other/guid/123"],
			["http://x/api/data/123", "http://x/api/data"],
			["", ""],
		];
		for (let caching of [false, true]) {
			for (let [id, expected] of cases) {
				it(`${JSON.stringify(id)} -> ${JSON.stringify(expected)} (caching ${caching})`, () => {
					EcRemoteLinkedData.caching = caching;
					EcRemoteLinkedData.tvfuCache = {};
					expect(EcRemoteLinkedData.trimVersionFromUrl(id)).to.equal(expected);
					if (caching && id != null)
						expect(EcRemoteLinkedData.tvfuCache[id]).to.equal(expected);
					else
						expect(EcRemoteLinkedData.tvfuCache).to.deep.equal({});
					expect(EcRemoteLinkedData.trimVersionFromUrl(id)).to.equal(expected);
				});
			}
		}
		it("returns a cached value when caching", () => {
			EcRemoteLinkedData.caching = true;
			EcRemoteLinkedData.tvfuCache = { "http://x/api/data/a/1": "cached" };
			expect(EcRemoteLinkedData.trimVersionFromUrl("http://x/api/data/a/1")).to.equal("cached");
		});
	});

	describe("ids and timestamps", () => {
		let clock;
		beforeEach(() => {
			clock = sinon.useFakeTimers({ now: 1234567 });
			sinon.stub(EcCrypto, "generateUUID").returns("UUID");
		});
		afterEach(() => clock.restore());
		let thing = () => new EcRemoteLinkedData("https://schema.cassproject.org/0.4/a/b", "Thing");
		it("getDottedType replaces every slash", () => {
			expect(thing().getDottedType()).to.equal("schema.cassproject.org.0.4.a.b.Thing");
			let h = new EcRemoteLinkedData("http://x.org", "T");
			expect(h.getDottedType()).to.equal("x.org.T");
		});
		it("generateId appends data/type/uuid/now", () => {
			let t = thing();
			t.generateId("http://s/api/");
			expect(t.id).to.equal("http://s/api/data/schema.cassproject.org.0.4.a.b.Thing/UUID/1234567");
			t.generateId("http://s/api");
			expect(t.id).to.equal("http://s/api/data/schema.cassproject.org.0.4.a.b.Thing/UUID/1234567");
			t.generateId("http://s/ce-");
			expect(t.id).to.equal("http://s/ce-data/schema.cassproject.org.0.4.a.b.Thing/UUID/1234567");
		});
		it("assignId appends data/type/identifier/now", () => {
			let t = thing();
			t.assignId("http://s/api", "my-id");
			expect(t.id).to.equal("http://s/api/data/schema.cassproject.org.0.4.a.b.Thing/my-id/1234567");
			t.assignId("http://s/api/", "my-id");
			expect(t.id).to.equal("http://s/api/data/schema.cassproject.org.0.4.a.b.Thing/my-id/1234567");
		});
		it("updateTimestamp replaces the version with now", () => {
			let t = thing();
			t.id = "http://s/api/data/T/guid/1";
			t.updateTimestamp();
			expect(t.id).to.equal("http://s/api/data/T/guid/1234567");
			t.id = "http://s/api/data/T/guid";
			t.updateTimestamp();
			expect(t.id).to.equal("http://s/api/data/T/guid");
			t.id = "http://s/api/data/T//5";
			t.updateTimestamp();
			expect(t.id).to.equal("http://s/api/data/T/1234567");
			t.id = "5";
			t.updateTimestamp();
			expect(t.id).to.equal("/1234567");
		});
	});

	describe("addOwner", () => {
		it("adds a pem once and clears the signature only when it adds", () => {
			let t = new EcRemoteLinkedData("https://schema.cassproject.org/0.4", "Thing");
			t.signature = ["s"];
			t.addOwner({ toPem: () => "A" });
			expect(t.owner).to.deep.equal(["A"]);
			expect(t.signature).to.equal(null);
			t.signature = ["s"];
			t.addOwner({ toPem: () => "A" });
			expect(t.owner).to.deep.equal(["A"]);
			expect(t.signature).to.deep.equal(["s"]);
			t.addOwner({ toPem: () => "B" });
			expect(t.owner).to.deep.equal(["A", "B"]);
		});
	});

	describe("invalid", () => {
		it("requires id, context and an http(s) type", () => {
			let t = new EcRemoteLinkedData("https://schema.cassproject.org/0.4", "Thing");
			expect(t.invalid()).to.equal(true);
			t.id = "x";
			expect(t.invalid()).to.equal(false);
			t.context = "http://a.org";
			expect(t.invalid()).to.equal(false);
			t.context = "urn:a";
			expect(t.invalid()).to.equal(true);
			t.context = null;
			expect(t.invalid()).to.equal(true);
			t.context = "x";
			t.type = "https://y/Thing";
			expect(t.invalid()).to.equal(false);
		});
	});

	describe("getSearchStringByType", () => {
		it("builds the full query", () => {
			let r = new EcRemoteLinkedData("https://schema.cassproject.org/0.4", "Thing");
			r.getTypes = () => ["http://a.org/x/T1", "https://b.org/T2", "urn:c"];
			expect(r.getSearchStringByType()).to.equal(
				'(@type:"http://a.org/x/T1" OR (@context:"http://a.org/x/" AND @type:"T1") OR @type:"https://b.org/T2" OR (@context:"https://b.org/" AND @type:"T2") OR @type:"urn:c" OR (@context:"" AND @type:"urn:c")' +
				' OR \\*encryptedType:"http://a.org/x/T1" OR (@context:"https://schema.cassproject.org/kbac/0.4" AND \\*encryptedType:"T1")' +
				' OR \\*encryptedType:"https://b.org/T2" OR (@context:"https://schema.cassproject.org/kbac/0.4" AND \\*encryptedType:"T2")' +
				' OR \\*encryptedType:"urn:c" OR (@context:"https://schema.cassproject.org/kbac/0.4" AND \\*encryptedType:"urn:c")' +
				' OR (@context:"https://a.org/x/" AND @type:"T1") OR (@context:"http://b.org/" AND @type:"T2") OR )'
			);
		});
		it("returns () with no types", () => {
			let r = new EcRemoteLinkedData("https://schema.cassproject.org/0.4", "Thing");
			r.getTypes = () => [];
			expect(r.getSearchStringByType()).to.equal("()");
		});
		it("for a real class", () => {
			let s = new EcCompetency().getSearchStringByType();
			expect(s.startsWith('(@type:"https://schema.cassproject.org/0.4/Competency" OR (@context:"https://schema.cassproject.org/0.4/" AND @type:"Competency")')).to.equal(true);
			expect(s).to.include(' OR \\*encryptedType:"https://schema.cassproject.org/0.4/Competency" OR (@context:"https://schema.cassproject.org/kbac/0.4" AND \\*encryptedType:"Competency")');
			expect(s.endsWith(' OR (@context:"https://schema.eduworks.com/cass/0.1/" AND @type:"competency"))')).to.equal(true);
		});
	});

	describe("upgrade", () => {
		it("copies @-prefixed KBAC fields to their plain names", () => {
			let t = new EcRemoteLinkedData("https://schema.cassproject.org/0.4", "Thing");
			sinon.stub(t, "handleForwarding");
			t["@owner"] = ["o"];
			t["@reader"] = ["r"];
			t["@signature"] = ["s"];
			t["@signatureSha256"] = ["s2"];
			t["@encryptedType"] = "et";
			t["@encryptedContext"] = "ec";
			t.upgrade();
			expect([t.owner, t.reader, t.signature, t.signatureSha256, t.encryptedType, t.encryptedContext])
				.to.deep.equal([["o"], ["r"], ["s"], ["s2"], "et", "ec"]);
			expect(t.handleForwarding.calledOnce).to.equal(true);
			let u = new EcRemoteLinkedData("https://schema.cassproject.org/0.4", "Thing");
			u.owner = ["keep"];
			sinon.stub(u, "handleForwarding");
			u.upgrade();
			expect(u.owner).to.deep.equal(["keep"]);
			expect(u.reader).to.equal(null);
		});
	});

	describe("verify", () => {
		let t, verify, verify256;
		beforeEach(() => {
			t = new EcRemoteLinkedData("https://schema.cassproject.org/0.4", "Thing");
			t.id = "http://x/1";
			sinon.stub(EcPk, "fromPem").callsFake((p) => "PK:" + p);
			verify = sinon.stub(EcRsaOaepAsyncWorker, "verify");
			verify256 = sinon.stub(EcRsaOaepAsyncWorker, "verifySha256");
			sinon.stub(console, "log");
		});
		it("returns false without signatures", async () => {
			expect(await t.verify()).to.equal(false);
		});
		for (let [result, expected] of [[true, true], [false, false], [1, true], ["1", true], ["true", false], [null, false], [undefined, false]]) {
			it(`treats a verify result of ${JSON.stringify(result)} as ${expected}`, async () => {
				t.owner = ["o1"];
				t.signature = ["sig"];
				verify.resolves(result);
				expect(await t.verify()).to.equal(expected);
				delete t.signature;
				t.signatureSha256 = ["sig"];
				verify256.resolves(result);
				expect(await t.verify()).to.equal(expected);
			});
		}
		it("treats a thrown verification as not verified and tries the next owner", async () => {
			t.owner = ["o1", "o2", "o3"];
			t.signature = ["sig"];
			verify.onFirstCall().rejects(new Error("bad"));
			verify.onSecondCall().resolves(true);
			expect(await t.verify()).to.equal(true);
			expect(verify.callCount).to.equal(2);
			expect(verify.firstCall.args[0]).to.equal("PK:o1");
			expect(verify.secondCall.args[0]).to.equal("PK:o2");
			expect(verify.firstCall.args[2]).to.equal("sig");
		});
		it("requires every signature to verify", async () => {
			t.owner = ["o1"];
			t.signature = ["a", "b"];
			verify.withArgs("PK:o1", sinon.match.any, "a").resolves(true);
			verify.withArgs("PK:o1", sinon.match.any, "b").resolves(false);
			expect(await t.verify()).to.equal(false);
		});
		it("returns false with signatures but no owners", async () => {
			t.signature = ["a"];
			expect(await t.verify()).to.equal(false);
			delete t.signature;
			t.signatureSha256 = ["a"];
			expect(await t.verify()).to.equal(false);
		});
		it("needs both kinds to verify when both are present", async () => {
			t.owner = ["o1"];
			t.signature = ["a"];
			t.signatureSha256 = ["b"];
			verify.resolves(true);
			verify256.rejects(new Error("x"));
			expect(await t.verify()).to.equal(false);
			verify256.resolves(true);
			expect(await t.verify()).to.equal(true);
			expect(verify256.lastCall.args[1]).to.equal(t.toSignableJson());
		});
		it("returns false for empty signature arrays", async () => {
			t.signature = [];
			t.signatureSha256 = [];
			expect(await t.verify()).to.equal(false);
		});
	});

	describe("EcLinkedData", () => {
		it("getFullType", () => {
			let l = new EcLinkedData(null, "T");
			expect(l.getFullType()).to.equal("T");
			l = new EcLinkedData("https://a.org", "T");
			expect(l.getFullType()).to.equal("https://a.org/T");
			l.type = "https://b.org/U";
			expect(l.getFullType()).to.equal("https://b.org/U");
			l.type = "xhttpx";
			expect(l.getFullType()).to.equal("xhttpx");
			l.context = { ns: "https://c.org", "@vocab": "https://v.org/" };
			l.type = "ns:V";
			expect(l.getFullType()).to.equal("https://c.org/V");
			l.type = "W";
			expect(l.getFullType()).to.equal("https://v.org/W");
		});
		describe("toSignableJson", () => {
			let mk = (ctx, type) => {
				let t = new EcRemoteLinkedData(ctx, "x");
				t.type = type;
				t.id = "http://x/1";
				t.owner = ["o"];
				t.reader = ["r"];
				t.signature = ["s"];
				t.signatureSha256 = ["s2"];
				t.name = "n";
				return t;
			};
			it("strips owner/reader/signatures for eduworks 0.1 types", () => {
				let t = mk("http://schema.eduworks.com/cass/0.1", "http://schema.eduworks.com/cass/0.1/competency");
				expect(t.toSignableJson()).to.equal('{"@context":"http://schema.eduworks.com/cass/0.1","@type":"http://schema.eduworks.com/cass/0.1/competency","name":"n","signatureSha256":["s2"]}');
			});
			it("strips only signatures and id for other types", () => {
				let t = mk("http://schema.eduworks.com/cass/0.2", "http://schema.eduworks.com/cass/0.2/competency");
				expect(t.toSignableJson()).to.equal('{"@context":"http://schema.eduworks.com/cass/0.2","@type":"http://schema.eduworks.com/cass/0.2/competency","name":"n","owner":["o"],"reader":["r"]}');
				let u = mk("https://schema.cassproject.org/0.1", "https://schema.cassproject.org/0.1/Competency");
				expect(u.toSignableJson()).to.equal('{"@context":"https://schema.cassproject.org/0.1","@type":"https://schema.cassproject.org/0.1/Competency","name":"n","owner":["o"],"reader":["r"]}');
			});
		});
		describe("recast", () => {
			let report;
			beforeEach(() => {
				report = sinon.stub(global.auditLogger, "report");
			});
			it("expands, compacts into the target context and copies the result", async () => {
				let t = new EcLinkedData("https://a.org", "T");
				t.name = "old";
				sinon.stub(jsonld, "expand").resolves(["EXPANDED"]);
				let compact = sinon.stub(jsonld, "compact").resolves({ "@context": "https://a.org", "@type": "T", name: "new" });
				let loader = () => { };
				let r = await t.recast("TRANS", "TARGET", loader);
				expect(r).to.equal(t);
				expect(t.name).to.equal("new");
				expect(t["@context"]).to.equal("TARGET");
				expect(jsonld.expand.firstCall.args[0]["@context"]).to.equal("TRANS");
				expect(jsonld.expand.firstCall.args[1]).to.deep.equal({ documentLoader: loader });
				expect(compact.firstCall.args).to.deep.equal([["EXPANDED"], "TARGET", { documentLoader: loader }]);
			});
			it("defaults the target context to the object's own @context", async () => {
				let t = new EcLinkedData("https://a.org", "T");
				sinon.stub(jsonld, "expand").resolves([]);
				let compact = sinon.stub(jsonld, "compact").resolves({ "@context": "https://a.org", "@type": "T" });
				await t.recast("TRANS");
				expect(compact.firstCall.args).to.deep.equal([[], "https://a.org", undefined]);
				expect(t["@context"]).to.equal("https://a.org");
			});
			it("reports and returns undefined when expand fails", async () => {
				let t = new EcLinkedData("https://a.org", "T");
				sinon.stub(jsonld, "expand").rejects(new Error("boom"));
				let compact = sinon.stub(jsonld, "compact");
				expect(await t.recast("TRANS", "TARGET")).to.equal(undefined);
				expect(report.firstCall.args.slice(2)).to.deep.equal(["EcLinkedDataRecast", "boom"]);
				expect(compact.called).to.equal(false);
			});
			it("reports the error object and returns undefined when compact fails", async () => {
				let t = new EcLinkedData("https://a.org", "T");
				t.name = "keep";
				let err = new Error("compact");
				sinon.stub(jsonld, "expand").resolves([]);
				sinon.stub(jsonld, "compact").rejects(err);
				expect(await t.recast("TRANS", "TARGET")).to.equal(undefined);
				expect(report.firstCall.args.slice(2)).to.deep.equal(["EcLinkedDataRecast", err]);
				expect(t.name).to.equal("keep");
			});
		});
		describe("compact", () => {
			it("copies the compacted form and calls success with this", async () => {
				let t = new EcLinkedData("https://a.org", "T");
				sinon.stub(jsonld, "compact").resolves({ "@context": "https://a.org", "@type": "T", name: "c" });
				let success = sinon.spy(), failure = sinon.spy();
				let before = t.toJson();
				await t.compact("CTX", success, failure);
				expect(jsonld.compact.firstCall.args).to.deep.equal([before, "CTX"]);
				expect(t.name).to.equal("c");
				expect(success.calledOnceWithExactly(t)).to.equal(true);
				expect(failure.called).to.equal(false);
			});
			it("calls failure on error", async () => {
				let t = new EcLinkedData("https://a.org", "T");
				let err = new Error("x");
				sinon.stub(jsonld, "compact").rejects(err);
				let success = sinon.spy(), failure = sinon.spy();
				await t.compact("CTX", success, failure);
				expect(failure.calledOnceWithExactly(err)).to.equal(true);
				expect(success.called).to.equal(false);
			});
		});
	});

	describe("EcQuestion", () => {
		let q = (props) => Object.assign(new EcQuestion(), props);
		it("getQuestionType", () => {
			expect(q({}).getQuestionType({})).to.equal(EcQuestion.HAND_GRADED_ESSAY);
			expect(q({ acceptedAnswer: [] }).getQuestionType({})).to.equal(EcQuestion.HAND_GRADED_ESSAY);
			expect(q({ acceptedAnswer: ["a"] }).getQuestionType({})).to.equal(EcQuestion.SHORT_ANSWER);
			expect(q({ acceptedAnswer: ["a"], text: "fill __ in" }).getQuestionType({})).to.equal(EcQuestion.FILL_IN_THE_BLANK);
			expect(q({ acceptedAnswer: ["a"], text: "fill _ in" }).getQuestionType({})).to.equal(EcQuestion.SHORT_ANSWER);
			expect(q({ acceptedAnswer: ["a"], text: ["__"] }).getQuestionType({})).to.equal(EcQuestion.FILL_IN_THE_BLANK);
			expect(q({ acceptedAnswer: ["a"], text: ["a__"] }).getQuestionType({})).to.equal(EcQuestion.SHORT_ANSWER);
			expect(q({ acceptedAnswer: ["a"], suggestedAnswer: [] }).getQuestionType({})).to.equal(EcQuestion.SHORT_ANSWER);
			expect(q({ acceptedAnswer: ["a"], suggestedAnswer: [], text: "__" }).getQuestionType({})).to.equal(EcQuestion.FILL_IN_THE_BLANK);
			expect(q({ acceptedAnswer: ["a"], suggestedAnswer: [], text: "_" }).getQuestionType({})).to.equal(EcQuestion.SHORT_ANSWER);
			expect(q({ acceptedAnswer: ["a", "b"], suggestedAnswer: ["c"] }).getQuestionType({})).to.equal(EcQuestion.MULTIPLE_SELECT);
			expect(q({ acceptedAnswer: ["a"], suggestedAnswer: ["c"] }).getQuestionType({})).to.equal(EcQuestion.MULTIPLE_CHOICE);
			expect(() => q({ acceptedAnswer: ["a"], text: {} }).getQuestionType({})).to.throw(TypeError);
		});
		it("cementAnswerId replaces matching versions", () => {
			let o = q({ acceptedAnswer: ["http://x/api/data/a/1/1", "b"], suggestedAnswer: ["http://x/api/data/a/1/2", "c"] });
			o.cementAnswerId("http://x/api/data/a/1/9");
			expect(o.acceptedAnswer).to.deep.equal(["http://x/api/data/a/1/9", "b"]);
			expect(o.suggestedAnswer).to.deep.equal(["http://x/api/data/a/1/9", "c"]);
			q({}).cementAnswerId("x");
		});
		it("add/remove answers", () => {
			let o = q({});
			o.addAcceptedAnswer({ id: "http://x/api/data/a/g1/1" });
			o.addSuggestedAnswer({ id: "http://x/api/data/b/g1/1" });
			expect(o.acceptedAnswers()).to.deep.equal(["http://x/api/data/a/g1/1"]);
			expect(o.suggestedAnswers()).to.deep.equal(["http://x/api/data/b/g1/1"]);
			o.removeAcceptedAnswerById("http://x/api/data/a/g1");
			o.removeSuggestedAnswerById("http://x/api/data/b/g1/5");
			expect(o.acceptedAnswer).to.deep.equal([]);
			expect(o.suggestedAnswer).to.deep.equal([]);
			q({}).removeAcceptedAnswerById("x");
			q({}).removeSuggestedAnswerById("x");
		});
		let throwing = [
			["cementAnswerId", { acceptedAnswer: "x" }, "Accepted Answer is not Array"],
			["cementAnswerId", { suggestedAnswer: "x" }, "Suggested Answer is not Array"],
			["addAcceptedAnswer", { acceptedAnswer: "x" }, "Accepted Answer is not Array"],
			["addSuggestedAnswer", { suggestedAnswer: "x" }, "Suggested Answer is not Array"],
			["removeSuggestedAnswerById", { suggestedAnswer: "x" }, "Suggested Answer is not Array"],
			["removeAcceptedAnswerById", { acceptedAnswer: "x" }, "Accepted Answer is not Array"],
		];
		for (let [method, props, msg] of throwing) {
			it(`${method} throws "${msg}" for a non-array`, () => {
				let err = null;
				try {
					q(props)[method]({ id: "a" });
				} catch (e) {
					err = e;
				}
				expect(err).to.be.instanceOf(Error);
				expect(err.constructor).to.equal(Error);
				expect(err.toString()).to.equal("Error: " + msg);
				expect(err.message).to.equal(msg);
			});
		}
	});

	describe("EcOrganization", () => {
		let person = (id) => ({ shortId: () => id });
		it("addEmployee adds a person's short id once", () => {
			let o = new EcOrganization();
			o.addEmployee(person("p1"));
			o.addEmployee(person("p2"));
			o.addEmployee(person("p1"));
			expect(o.employee).to.deep.equal(["p1", "p2"]);
			o.employee = "x";
			expect(() => o.addEmployee(person("p1"))).to.throw("Employee is not Array");
		});
		it("movePersonMembersToEmployee moves ids containing 'person' (case-insensitive), skipping the element after each move", () => {
			let o = new EcOrganization();
			o.member = ["http://x/Person/1", "http://x/PERSON/2", "http://x/org/3", "http://x/person/4", "http://x/person/1"];
			o.employee = ["http://x/person/4"];
			o.movePersonMembersToEmployee();
			expect(o.employee).to.deep.equal(["http://x/person/4", "http://x/Person/1"]);
			expect(o.member).to.deep.equal(["http://x/PERSON/2", "http://x/org/3", "http://x/person/1"]);
			let p = new EcOrganization();
			p.movePersonMembersToEmployee();
			expect(p.employee).to.equal(undefined);
			p.member = "x";
			p.movePersonMembersToEmployee();
			expect(p.employee).to.deep.equal([]);
		});
		it("ppkListToPemArrayString", () => {
			let o = new EcOrganization();
			expect(o.ppkListToPemArrayString(null)).to.equal("[]");
			expect(o.ppkListToPemArrayString([])).to.equal("[]");
			expect(o.ppkListToPemArrayString([{ toPem: () => "a" }, { toPem: () => "b" }])).to.equal('["a","b"]');
		});
		it("rekeyAndSave without a repository fails or reports", async () => {
			let o = new EcOrganization();
			let failure = sinon.spy();
			expect(await o.rekeyAndSave(null, failure, null, {})).to.equal(undefined);
			expect(failure.args).to.deep.equal([["Repository cannot be null for a rekey operation"]]);
			let report = sinon.stub(global.auditLogger, "report");
			expect(await o.rekeyAndSave(null, null, null, {})).to.equal(undefined);
			expect(report.firstCall.args.slice(2)).to.deep.equal(["EcOrgRekeyAndSave", "Repository cannot be null for a rekey operation"]);
		});
		it("getOrgKeys decrypts the encrypted key set in order", async () => {
			let o = new EcOrganization();
			o[EcOrganization.ORG_PPK_SET_KEY] = { "@type": "EncryptedValue", "@context": Ebac.context, payload: "p" };
			sinon.stub(EcEncryptedValue.prototype, "decryptIntoString").resolves('["k1","k2"]');
			sinon.stub(EcPpk, "fromPem").callsFake((p) => "PPK:" + p);
			expect(await o.getOrgKeys()).to.deep.equal(["PPK:k1", "PPK:k2"]);
			expect(await o.getCurrentOrgKey()).to.equal("PPK:k2");
			o[EcOrganization.ORG_PPK_SET_KEY] = ["plain"];
			expect(await o.getOrgKeys()).to.deep.equal(["plain"]);
			delete o[EcOrganization.ORG_PPK_SET_KEY];
			expect(await o.getOrgKeys()).to.deep.equal([]);
			expect(await o.getCurrentOrgKey()).to.equal(null);
		});
	});
});
