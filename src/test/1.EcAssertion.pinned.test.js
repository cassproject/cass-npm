require("../../index.js");
const { expect } = require("chai");
const sinon = require("sinon");

describe("EcAssertion setters (pinned behaviour)", () => {
	afterEach(() => sinon.restore());
	let pk = (pem) => ({ toPem: () => pem });
	let mk = () => {
		let a = new EcAssertion();
		a.id = "http://x/api/data/a/guid/1";
		return a;
	};

	describe("setSubject / setSubjectAsync", () => {
		for (let async of [false, true]) {
			let label = async ? "setSubjectAsync" : "setSubject";
			let run = async (a, p) => {
				if (!async) return a.setSubject(p);
				let success = sinon.spy();
				await a.setSubjectAsync(p, success, "FAIL");
				expect(success.calledOnceWithExactly()).to.equal(true);
			};
			let stubEncrypt = () => async
				? sinon.stub(EcEncryptedValue, "encryptValueAsync").callsFake((text, id, owners, readers, s, f) => {
					expect(f).to.equal("FAIL");
					s({ enc: text, owners, readers });
				})
				: sinon.stub(EcEncryptedValue, "encryptValue").callsFake(async (text, id, owners, readers) => ({ enc: text, owners, readers }));
			it(`${label}: encrypts the pem for owners and a copy of the readers`, async () => {
				let enc = stubEncrypt();
				let a = mk();
				a.owner = ["o1"];
				a.reader = ["r1"];
				await run(a, pk("PEM"));
				expect(a.subject).to.deep.equal({ enc: "PEM", owners: ["o1"], readers: ["r1", "PEM"] });
				expect(a.reader).to.deep.equal(["r1"]);
				expect(enc.firstCall.args[1]).to.equal(a.id);
				expect(enc.firstCall.args[3]).to.not.equal(a.reader);
			});
			it(`${label}: merges the previous subject's owners and readers`, async () => {
				stubEncrypt();
				let a = mk();
				a.owner = ["o1"];
				a.reader = [{ k: "r1" }];
				a.subject = { owner: ["so"], reader: ["sr"] };
				await run(a, pk("PEM"));
				expect(a.subject).to.deep.equal({ enc: "PEM", owners: ["so", "o1"], readers: [{ k: "r1" }, "sr", "PEM"] });
				expect(a.subject.readers[0]).to.not.equal(a.reader[0]);
			});
			it(`${label}: works without owners or readers`, async () => {
				stubEncrypt();
				let a = mk();
				await run(a, pk("PEM"));
				expect(a.subject).to.deep.equal({ enc: "PEM", owners: [], readers: ["PEM"] });
			});
		}
	});

	describe("encrypted field setters", () => {
		let fields = [
			["setAgent", "agent", pk("APEM"), "APEM"],
			["setAssertionDate", "assertionDate", 1234, "1234"],
			["setExpirationDate", "expirationDate", 5678, "5678"],
			["setDecayFunction", "decayFunction", "t^2", "t^2"],
			["setNegative", "negative", true, "true"],
		];
		for (let [method, field, value, text] of fields) {
			it(`${method} encrypts with the subject's owners and readers`, async () => {
				let enc = sinon.stub(EcEncryptedValue, "encryptValue").callsFake(async (t, id, o, r) => ({ t, id, o, r }));
				let a = mk();
				a.subject = { owner: ["so"], reader: ["sr"] };
				let ret = await a[method](value);
				expect(ret).to.equal(undefined);
				expect(a[field]).to.deep.equal({ t: text, id: a.id, o: ["so"], r: ["sr"] });
				expect(enc.calledOnce).to.equal(true);
			});
			it(`${method}Async sets the field from the callback and then calls success`, () => {
				let order = [];
				sinon.stub(EcEncryptedValue, "encryptValueAsync").callsFake((t, id, o, r, s, f) => {
					expect(f).to.equal("FAIL");
					s({ t, id, o, r });
					return "RET";
				});
				let a = mk();
				a.subject = { owner: ["so"], reader: ["sr"] };
				let ret = a[method + "Async"](value, () => order.push(JSON.stringify(a[field])), "FAIL");
				expect(ret).to.equal("RET");
				expect(order).to.deep.equal([JSON.stringify({ t: text, id: a.id, o: ["so"], r: ["sr"] })]);
			});
		}
		it("setEvidence encrypts each evidence in order", async () => {
			let calls = [];
			sinon.stub(EcEncryptedValue, "encryptValue").callsFake(async (t) => {
				calls.push(t);
				return "E:" + t;
			});
			let a = mk();
			a.subject = { owner: ["so"], reader: ["sr"] };
			await a.setEvidence(["e1", "e2", "e3"]);
			expect(calls).to.deep.equal(["e1", "e2", "e3"]);
			expect(a.evidence).to.deep.equal(["E:e1", "E:e2", "E:e3"]);
			await a.setEvidence([]);
			expect(a.evidence).to.deep.equal([]);
		});
		it("setEvidence leaves evidence unchanged if an encryption fails", async () => {
			sinon.stub(EcEncryptedValue, "encryptValue")
				.onFirstCall().resolves("ok")
				.onSecondCall().rejects(new Error("bad"));
			let a = mk();
			a.subject = { owner: [], reader: [] };
			a.evidence = ["old"];
			let err = null;
			try {
				await a.setEvidence(["e1", "e2"]);
			} catch (e) {
				err = e;
			}
			expect(err.message).to.equal("bad");
			expect(a.evidence).to.deep.equal(["old"]);
		});
	});

	describe("addReader / removeReader", () => {
		for (let method of ["addReader", "removeReader"]) {
			it(`${method} updates every encrypted field, each evidence in order, then the object`, async () => {
				let calls = [];
				let ev = (name) => ({ [method]: async (r, eim) => calls.push([name, r, eim]) });
				let a = mk();
				a.agent = ev("agent");
				a.assertionDate = ev("assertionDate");
				a.decayFunction = ev("decayFunction");
				a.evidence = [ev("e1"), ev("e2")];
				a.expirationDate = ev("expirationDate");
				a.negative = ev("negative");
				a.subject = ev("subject");
				a.reader = ["x"];
				let reader = { toPem: () => "R" };
				await a[method](reader, "EIM");
				expect(calls.map((c) => c[0])).to.deep.equal(
					["agent", "assertionDate", "decayFunction", "e1", "e2", "expirationDate", "negative", "subject"]);
				expect(calls.every((c) => c[1] === reader && c[2] === "EIM")).to.equal(true);
				expect(a.reader).to.deep.equal(method == "addReader" ? ["x", "R"] : ["x"]);
			});
			it(`${method} with no encrypted fields only updates the object`, async () => {
				let a = mk();
				a.evidence = [];
				await a[method]({ toPem: () => "R" });
				expect(a.reader).to.deep.equal(method == "addReader" ? ["R"] : []);
			});
		}
	});
});
