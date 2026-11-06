require('../../index.js');
const chai = require('chai');
const sinon = require('sinon');
const EcRepository = require('../org/cassproject/ebac/repository/EcRepository.js');

const assert = chai.assert;

const SERVER = "http://repo.test/api/";

const savingRepo = (saved, selectedServer) => ({ selectedServer: selectedServer || SERVER, saveTo: (o, s) => { saved.push(o); s("ok"); } });

describe('CSVImport', () => {
    afterEach(() => sinon.restore());

    describe('transformId', () => {
        const transform = (oldId) => {
            const c = new EcCompetency();
            CSVImport.transformId(oldId, c, SERVER);
            return c.id;
        };

        it('keeps ids that contain http in any case', () => {
            assert.equal(transform("http://x/1"), "http://x/1");
            assert.equal(transform("HTTPS://X/1"), "HTTPS://X/1");
            assert.equal(transform("urn:http-thing"), "urn:http-thing");
        });

        it('assigns a server id for other values', () => {
            assert.isTrue(transform("abc").startsWith(SERVER + "data/schema.cassproject.org.0.4.Competency/abc/"));
            assert.isTrue(transform("").startsWith(SERVER + "data/"));
            assert.isTrue(transform(null).startsWith(SERVER + "data/"));
        });
    });

    describe('importCompetencies', () => {
        const run = (csv, opts, relationsCsv) => new Promise((resolve, reject) => {
            opts = Object.assign({ nameIndex: 0, descriptionIndex: 1, scopeIndex: -1, idIndex: -1, sourceIndex: 0, relationTypeIndex: 1, destIndex: 2 }, opts);
            CSVImport.importCompetencies(csv, opts.serverUrl || SERVER, null, opts.nameIndex, opts.descriptionIndex, opts.scopeIndex, opts.idIndex,
                relationsCsv || null, opts.sourceIndex, opts.relationTypeIndex, opts.destIndex,
                (c, r) => resolve({ c, r }), reject, () => { }, opts.uniquify, opts.repo);
        });

        it('copies extra columns, skipping dotted, @ and blank ones', async () => {
            const csv = "name,description,owner,ex:extra,a.b,@x,\nOne,D1,pk1,E1,ab,x,y\n,skip,,,,,\n";
            const { c, r } = await run(csv, { repo: savingRepo([]) });
            assert.lengthOf(c, 1);
            assert.equal(c[0].name, "One");
            assert.equal(c[0].description, "D1");
            assert.deepEqual(c[0].owner, ["pk1"]);
            assert.equal(c[0]["ex:extra"], "E1");
            assert.isUndefined(c[0]["a.b"]);
            assert.isUndefined(c[0]["@x"]);
            assert.deepEqual(r, []);
        });

        it('generates versioned ids when the repository server contains the server url', async () => {
            const { c } = await run("name,description\nOne,D1", { repo: savingRepo([], SERVER + "more") });
            assert.isTrue(c[0].id.startsWith(SERVER));
            assert.notEqual(c[0].id, c[0].shortId());
        });

        it('generates short ids when the repository server does not contain the server url', async () => {
            const { c } = await run("name,description\nOne,D1", { serverUrl: "http://other.test/", repo: savingRepo([]) });
            assert.isTrue(c[0].id.startsWith("http://other.test/"));
            assert.equal(c[0].id, c[0].shortId());
        });

        it('generates versioned ids and saves through EcRepository without a repository', async () => {
            const save = sinon.stub(EcRepository, 'save').callsFake((o, s) => s("ok"));
            const { c } = await run("name,description\nOne,D1", {});
            assert.notEqual(c[0].id, c[0].shortId());
            assert.isTrue(save.calledOnce);
        });

        it('uses the id column unless uniquify is set', async () => {
            const { c } = await run("name,description,id\nOne,D1,http://old/1\nTwo,D2,two", { idIndex: 2, repo: savingRepo([]) });
            assert.equal(c[0].id, "http://old/1");
            assert.isTrue(c[1].id.startsWith(SERVER + "data/schema.cassproject.org.0.4.Competency/two/"));
            assert.equal(CSVImport.importCsvLookup["http://old/1"], "http://old/1");
            assert.equal(CSVImport.importCsvLookup["One"], "http://old/1");

            const u = await run("name,description,id\nOne,D1,http://old/1", { idIndex: 2, uniquify: true, repo: savingRepo([]) });
            assert.notEqual(u.c[0].id, "http://old/1");
            assert.equal(CSVImport.importCsvLookup["http://old/1"], u.c[0].shortId());
        });

        it('imports relations, resolving names and old ids through the lookup', async () => {
            const saved = [];
            const { c, r } = await run("name,description\nParent,P\nChild,C", { repo: savingRepo(saved) },
                "source,type,target\nChild,narrows,Parent\n,,\nChild,requires,http://elsewhere/x");
            assert.lengthOf(r, 2);
            assert.deepEqual(r.map(x => [x.source, x.relationType, x.target]), [
                [c[1].shortId(), "narrows", c[0].shortId()],
                [c[1].shortId(), "requires", "http://elsewhere/x"]
            ]);
            for (const x of r) {
                assert.isTrue(x.id.startsWith(SERVER));
                assert.notEqual(x.id, x.shortId());
            }
        });

        it('imports relations with short ids when the repository server does not contain the server url', async () => {
            const { r } = await run("name,description\nParent,P\nChild,C", { serverUrl: "http://other.test/", repo: savingRepo([]) },
                "source,type,target\nChild,narrows,Parent");
            assert.isTrue(r[0].id.startsWith("http://other.test/"));
            assert.equal(r[0].id, r[0].shortId());
        });

        it('imports relations with versioned ids without a repository', async () => {
            sinon.stub(EcRepository, 'save').callsFake((o, s) => s("ok"));
            const { r } = await run("name,description\nParent,P\nChild,C", {}, "source,type,target\nChild,narrows,Parent");
            assert.notEqual(r[0].id, r[0].shortId());
        });
    });

    describe('transformReferences', () => {
        it('throws on string values because Object.toString is Function.prototype.toString', () => {
            CSVImport.importCsvLookup = { old: "new" };
            assert.throws(() => CSVImport.transformReferences({ a: "old" }), TypeError);
            assert.throws(() => CSVImport.transformReferences({ a: { b: 1 } }), TypeError);
        });

        it('skips null values and leaves function values alone', () => {
            CSVImport.importCsvLookup = { old: "new" };
            const fn = function old() { };
            const data = { a: null, b: undefined, c: fn };
            CSVImport.transformReferences(data);
            assert.deepEqual(data, { a: null, b: undefined, c: fn });
        });

        it('replaces a function value whose source text names String and is in the lookup', () => {
            const fn = function () { return String; };
            CSVImport.importCsvLookup = {};
            CSVImport.importCsvLookup[fn] = "replaced";
            const data = { c: fn };
            CSVImport.transformReferences(data);
            assert.equal(data.c, "replaced");
        });
    });

    describe('importData', () => {
        const run = (csv, idIndex, repo, serverUrl) => {
            const captured = [];
            sinon.stub(CSVImport, 'transformReferences');
            sinon.stub(CSVImport, 'saveTransformedData').callsFake((data) => captured.push(data));
            const failures = [];
            CSVImport.importData(csv, serverUrl || SERVER, null, null, (e) => failures.push(e), null, idIndex, "https://schema.cassproject.org/0.4", "Thing", repo);
            return { captured, failures };
        };

        it('expands dotted columns into nested objects and copies the rest', () => {
            const { captured, failures } = run("@id,name,a.b,a.c.d,x.\nhttp://f/1,N,B,D,X", -1, null);
            assert.deepEqual(failures, []);
            assert.lengthOf(captured, 1);
            const d = captured[0];
            assert.equal(d.name, "N");
            assert.deepEqual(d.a, { b: "B", c: { d: "D" } });
            assert.deepEqual(d.x, { "": "X" });
        });

        it('generates versioned ids when the repository server contains the server url', () => {
            const { captured } = run("name\nN", -1, { selectedServer: SERVER });
            assert.isTrue(captured[0].id.startsWith(SERVER));
            assert.notEqual(captured[0].id, captured[0].shortId());
        });

        it('generates short ids when the repository server does not contain the server url', () => {
            const { captured } = run("name\nN", -1, { selectedServer: SERVER }, "http://other.test/");
            assert.isTrue(captured[0].id.startsWith("http://other.test/"));
            assert.equal(captured[0].id, captured[0].shortId());
        });

        it('generates versioned ids without a repository and maps the file id', () => {
            const { captured } = run("@id,name\nhttp://f/1/123,N", undefined, null);
            assert.notEqual(captured[0].id, captured[0].shortId());
            assert.equal(CSVImport.importCsvLookup["http://f/1/123"], captured[0].shortId());
        });

        it('uses the id column when an id index is given', () => {
            const { captured } = run("name,id\nN,http://old/1", 1, null);
            assert.equal(captured[0].id, "http://old/1");
            assert.equal(CSVImport.importCsvLookup["http://old/1"], "http://old/1");
        });
    });
});
