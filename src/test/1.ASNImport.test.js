require('../../index.js');
const chai = require('chai');
const sinon = require('sinon');
const EcRepository = require('../org/cassproject/ebac/repository/EcRepository.js');

const assert = chai.assert;

const SERVER = "http://repo.test/api/";
const TYPE = "http://www.w3.org/1999/02/22-rdf-syntax-ns#type";
const TITLE = "http://purl.org/dc/elements/1.1/title";
const DESC = "http://purl.org/dc/terms/description";
const CHILD = "http://purl.org/gem/qualifiers/hasChild";
const STATEMENT = "http://purl.org/ASN/schema/core/Statement";
const DOCUMENT = "http://purl.org/ASN/schema/core/StandardDocument";

function asnDocument() {
    return {
        "http://asn.test/D1": { [TYPE]: [{ value: DOCUMENT }], [TITLE]: [{ value: "Doc" }], [DESC]: [{ value: "Doc desc" }], [CHILD]: [{ value: "http://asn.test/S1" }] },
        "http://asn.test/S1": { [TYPE]: [{ value: STATEMENT }], [DESC]: [{ value: "Statement one" }], [CHILD]: [{ value: "http://asn.test/S2" }, { value: "http://asn.test/S3" }] },
        "http://asn.test/S2": { [TYPE]: [{ value: STATEMENT }], [TITLE]: [{ value: "Two" }] },
        "http://asn.test/S3": { [TYPE]: [{ value: STATEMENT }], [TITLE]: [{ value: "Three" }], [DESC]: [{ value: "Three desc" }] }
    };
}

describe('ASNImport', () => {
    afterEach(() => sinon.restore());

    beforeEach(() => {
        ASNImport.jsonCompetencies = {};
        ASNImport.jsonFramework = null;
        ASNImport.frameworkUrl = "";
        ASNImport.lookThroughSource(asnDocument());
    });

    const run = (serverUrl, createFramework, repo) => new Promise((resolve, reject) => {
        const failures = [];
        ASNImport.importCompetencies(serverUrl, null, createFramework, (comps, fw) => resolve({ comps, fw, failures }), (e) => { failures.push(e); reject(e); }, () => { }, repo);
    });

    it('finds the framework, competencies and relation count', () => {
        assert.equal(ASNImport.frameworkUrl, "http://asn.test/D1");
        assert.deepEqual(Object.keys(ASNImport.jsonCompetencies), ["http://asn.test/S1", "http://asn.test/S2", "http://asn.test/S3"]);
        assert.equal(ASNImport.competencyCount, 3);
        assert.equal(ASNImport.relationCount, 2);
    });

    it('imports competencies keyed by their ASN ids and narrows relations with versioned ids', async () => {
        const saved = [];
        const repo = { selectedServer: SERVER, saveTo: (o, s) => { saved.push(o); s("ok"); } };
        const { comps, fw } = await run(SERVER, false, repo);
        assert.isNull(fw);
        assert.deepEqual(comps.map(c => [c.id, c.name, c.description]), [
            ["http://asn.test/S1", "Statement one", "Statement one"],
            ["http://asn.test/S2", "Two", undefined],
            ["http://asn.test/S3", "Three", "Three desc"]
        ]);
        const relations = saved.filter(o => o instanceof EcAlignment);
        assert.deepEqual(relations.map(r => [r.source, r.target, r.relationType]).sort(), [
            ["http://asn.test/S2", "http://asn.test/S1", "narrows"],
            ["http://asn.test/S3", "http://asn.test/S1", "narrows"]
        ]);
        for (const r of relations) {
            assert.isTrue(r.id.startsWith(SERVER));
            assert.notEqual(r.id, r.shortId());
        }
    });

    it('generates short relation ids when the repository server does not contain the server url', async () => {
        const saved = [];
        const repo = { selectedServer: SERVER, saveTo: (o, s) => { saved.push(o); s("ok"); } };
        await run("http://other.test/", false, repo);
        const relations = saved.filter(o => o instanceof EcAlignment);
        assert.lengthOf(relations, 2);
        for (const r of relations) {
            assert.isTrue(r.id.startsWith("http://other.test/"));
            assert.equal(r.id, r.shortId());
        }
    });

    it('generates versioned relation ids and saves through EcRepository without a repository', async () => {
        const saved = [];
        sinon.stub(EcRepository, 'save').callsFake((o, s) => { saved.push(o); s("ok"); });
        const { fw } = await run(SERVER, true, null);
        const relations = saved.filter(o => o instanceof EcAlignment);
        assert.lengthOf(relations, 2);
        for (const r of relations)
            assert.notEqual(r.id, r.shortId());
        assert.equal(fw.id, "http://asn.test/D1");
        assert.equal(fw.name, "Doc");
        assert.equal(fw.description, "Doc desc");
        assert.deepEqual(fw.competency, ["http://asn.test/S1", "http://asn.test/S2", "http://asn.test/S3"]);
        assert.lengthOf(fw.relation, 2);
    });

    describe('createFramework without a framework url', () => {
        const create = (serverUrl, repo) => new Promise((resolve, reject) => {
            ASNImport.importedFramework = new EcFramework();
            ASNImport.frameworkUrl = null;
            ASNImport.competencies = {};
            ASNImport.createFramework(serverUrl, null, (comps, fw) => resolve(fw), reject, repo);
        });

        it('generates a versioned id when the repository server contains the server url', async () => {
            const fw = await create(SERVER, { selectedServer: SERVER, saveTo: (o, s) => s("ok") });
            assert.isTrue(fw.id.startsWith(SERVER));
            assert.notEqual(fw.id, fw.shortId());
        });

        it('generates a short id when the repository server does not contain the server url', async () => {
            const fw = await create("http://other.test/", { selectedServer: SERVER, saveTo: (o, s) => s("ok") });
            assert.isTrue(fw.id.startsWith("http://other.test/"));
            assert.equal(fw.id, fw.shortId());
        });

        it('generates a versioned id without a repository', async () => {
            sinon.stub(EcRepository, 'save').callsFake((o, s) => s("ok"));
            const fw = await create(SERVER, null);
            assert.isTrue(fw.id.startsWith(SERVER));
            assert.notEqual(fw.id, fw.shortId());
        });
    });
});
