require('../../index.js');
const chai = require('chai');
const sinon = require('sinon');
const EcRepository = require('../org/cassproject/ebac/repository/EcRepository.js');

const assert = chai.assert;

const SERVER = "http://repo.test/api/";
const SRC = "http://src.test/api/data/";

function fixtures() {
    const store = {};
    const comp = (n) => {
        const c = new EcCompetency();
        c.id = SRC + "c" + n;
        c.name = "Comp " + n;
        store[c.id] = c;
        return c;
    };
    const c1 = comp(1);
    const c2 = comp(2);
    const r1 = new EcAlignment();
    r1.id = SRC + "r1";
    r1.source = c2.shortId();
    r1.target = c1.shortId();
    r1.relationType = "narrows";
    store[r1.id] = r1;
    const source = new EcFramework();
    source.id = SRC + "fw";
    source.name = "Source";
    source.competency = [c1.id, c2.id];
    source.relation = [r1.id];
    const target = new EcFramework();
    target.id = SERVER + "fw";
    target.name = "Target";
    return { store, source, target };
}

describe('FrameworkImport.importCompetencies', () => {
    let store;
    let gets;
    beforeEach(() => {
        gets = [];
        sinon.stub(EcRepository, 'getAs').callsFake((id, obj, success, failure) => {
            gets.push(id);
            if (store[id] == null) return failure("missing " + id);
            obj.copyFrom(JSON.parse(store[id].toJson()));
            success(obj);
        });
    });
    afterEach(() => sinon.restore());

    const run = (source, target, copy, serverUrl, repo) => new Promise((resolve, reject) => {
        FrameworkImport.importCompetencies(source, target, copy, serverUrl, null, (c, r) => resolve({ c, r }), reject, repo);
    });
    const savingRepo = (saved, selectedServer) => ({ selectedServer: selectedServer || SERVER, saveTo: (o, s) => { saved.push(o); s("ok"); } });

    it('reports missing source, target and competencies', () => {
        const failures = [];
        FrameworkImport.importCompetencies(null, null, false, SERVER, null, null, (e) => failures.push(e));
        FrameworkImport.importCompetencies(new EcFramework(), null, false, SERVER, null, null, (e) => failures.push(e));
        FrameworkImport.importCompetencies(new EcFramework(), new EcFramework(), false, SERVER, null, null, (e) => failures.push(e));
        assert.deepEqual(failures, ["Source Framework not set", "Target Framework not Set", "Source Has No Competencies"]);
    });

    describe('copy', () => {
        it('copies competencies and relations with versioned ids and remapped endpoints', async () => {
            const f = fixtures();
            store = f.store;
            const saved = [];
            const { c, r } = await run(f.source, f.target, true, SERVER, savingRepo(saved));
            assert.lengthOf(c, 2);
            assert.lengthOf(r, 1);
            for (const x of c.concat(r)) {
                assert.isTrue(x.id.startsWith(SERVER));
                assert.notEqual(x.id, x.shortId());
            }
            assert.deepEqual(c.map(x => x.name), ["Comp 1", "Comp 2"]);
            assert.equal(r[0].source, c[1].shortId());
            assert.equal(r[0].target, c[0].shortId());
            assert.deepEqual(f.target.competency.slice().sort(), c.map(x => x.shortId()).sort());
            assert.deepEqual(f.target.relation, [r[0].shortId()]);
            assert.deepEqual(gets, [SRC + "c1", SRC + "c2", SRC + "r1"]);
        });

        it('copies with short ids when the repository server does not contain the server url', async () => {
            const f = fixtures();
            store = f.store;
            const { c, r } = await run(f.source, f.target, true, "http://other.test/", savingRepo([]));
            for (const x of c.concat(r)) {
                assert.isTrue(x.id.startsWith("http://other.test/"));
                assert.equal(x.id, x.shortId());
            }
        });

        it('copies with versioned ids through EcRepository when there is no repository', async () => {
            const f = fixtures();
            store = f.store;
            const saved = [];
            sinon.stub(EcRepository, 'save').callsFake((o, s) => { saved.push(o); s("ok"); });
            const { c, r } = await run(f.source, f.target, true, SERVER, null);
            for (const x of c.concat(r))
                assert.notEqual(x.id, x.shortId());
            assert.lengthOf(saved, 5);
        });
    });

    describe('link', () => {
        it('links every competency and relation when the target has none', async () => {
            const f = fixtures();
            store = f.store;
            const saved = [];
            const { c, r } = await run(f.source, f.target, false, SERVER, savingRepo(saved));
            assert.deepEqual(c.map(x => x.id), [SRC + "c1", SRC + "c2"]);
            assert.deepEqual(r.map(x => x.id), [SRC + "r1"]);
            assert.deepEqual(f.target.competency, [SRC + "c1", SRC + "c2"]);
            assert.deepEqual(f.target.relation, [SRC + "r1"]);
            assert.deepEqual(saved, [f.target, f.target]);
        });

        it('skips competencies already in the target by exact or unversioned id', async () => {
            const f = fixtures();
            store = f.store;
            f.source.competency = [SRC + "c1", SRC + "c2/123"];
            store[SRC + "c2/123"] = store[SRC + "c2"];
            f.target.competency = [SRC + "c1", SRC + "c2"];
            let done = false;
            FrameworkImport.importCompetencies(f.source, f.target, false, SERVER, null, () => { done = true; }, () => { done = true; }, savingRepo([]));
            await new Promise(r => setTimeout(r, 20));
            assert.deepEqual(gets, []);
            // Nothing was linked, so the completion check never fires.
            assert.isFalse(done);
        });

        it('only fetches the competencies the target is missing, and then never completes', async () => {
            const f = fixtures();
            store = f.store;
            f.target.competency = [SRC + "c1"];
            const saved = [];
            let done = false;
            FrameworkImport.importCompetencies(f.source, f.target, false, SERVER, null, () => { done = true; }, () => { done = true; }, savingRepo(saved));
            await new Promise(r => setTimeout(r, 20));
            assert.deepEqual(gets, [SRC + "c2"]);
            assert.deepEqual(f.target.competency, [SRC + "c1", SRC + "c2"]);
            assert.deepEqual(saved, []);
            assert.isFalse(done);
        });

        it('skips a relation whose id is in the target, or whose same-index competency id is in the target relations', async () => {
            const f = fixtures();
            store = f.store;
            f.target.relation = [SRC + "r1"];
            let done = false;
            FrameworkImport.importCompetencies(f.source, f.target, false, SERVER, null, () => { done = true; }, () => { done = true; }, savingRepo([]));
            await new Promise(r => setTimeout(r, 20));
            assert.deepEqual(gets, [SRC + "c1", SRC + "c2"]);
            assert.isFalse(done);

            const g = fixtures();
            store = g.store;
            gets.length = 0;
            // The relation check compares against source.competency[i], not source.relation[i].
            g.target.relation = [SRC + "c1"];
            FrameworkImport.importCompetencies(g.source, g.target, false, SERVER, null, () => { done = true; }, () => { done = true; }, savingRepo([]));
            await new Promise(r => setTimeout(r, 20));
            assert.deepEqual(gets, [SRC + "c1", SRC + "c2"]);
            assert.isFalse(done);
        });
    });
});
