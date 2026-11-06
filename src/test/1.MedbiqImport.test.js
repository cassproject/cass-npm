require('../../index.js');
const chai = require('chai');
const sinon = require('sinon');
const EcRepository = require('../org/cassproject/ebac/repository/EcRepository.js');

const assert = chai.assert;

const SERVER = "http://repo.test/api/";

const competencyObject = (title, extra) => ({ lom: { general: Object.assign({ title: { string: title } }, extra) } });

describe('MedbiqImport', () => {
    afterEach(() => {
        sinon.restore();
        MedbiqImport.medbiqXmlCompetencies = null;
    });

    describe('medbiqXmlLookForCompetencyObject', () => {
        it('collects competency objects that have lom.general and skips the rest', () => {
            MedbiqImport.medbiqXmlCompetencies = [];
            MedbiqImport.medbiqXmlLookForCompetencyObject({
                root: {
                    CompetencyObject: [
                        competencyObject("One", { description: { string: "Desc" }, identifier: { entry: "urn:1" } }),
                        competencyObject("Two"),
                        { lom: { other: 1 } },
                        { lom: null },
                        { nothing: true }
                    ],
                    nested: { CompetencyObject: competencyObject("Three") }
                }
            });
            const found = MedbiqImport.medbiqXmlCompetencies;
            assert.deepEqual(found.map(c => c.name), ["One", "Two", "Three"]);
            assert.equal(found[0].description, "Desc");
            assert.equal(found[0].url, "urn:1");
            assert.equal(found[1].description, "");
            assert.isUndefined(found[1].url);
        });
    });

    describe('importCompetencies', () => {
        const prepare = (names) => {
            MedbiqImport.medbiqXmlCompetencies = names.map((n) => {
                const c = new EcCompetency();
                c.name = n;
                return c;
            });
        };
        const run = (serverUrl, repo) => new Promise((resolve, reject) => {
            const progress = [];
            MedbiqImport.importCompetencies(serverUrl, null, (comps) => resolve({ comps, progress }), reject, (p) => progress.push(JSON.parse(JSON.stringify(p))), repo);
        });

        it('generates versioned ids when the repository server contains the server url', async () => {
            prepare(["a", "b"]);
            const saved = [];
            const repo = { selectedServer: SERVER + "extra", saveTo: (o, s) => { saved.push(o); s("ok"); } };
            const { comps, progress } = await run(SERVER, repo);
            assert.lengthOf(comps, 2);
            assert.lengthOf(saved, 2);
            for (const c of comps) {
                assert.notEqual(c.id, c.shortId());
                assert.isTrue(c.id.startsWith(SERVER));
            }
            assert.deepEqual(progress, [{ competencies: 2 }]);
        });

        it('generates short ids when the repository server does not contain the server url', async () => {
            prepare(["a"]);
            const repo = { selectedServer: SERVER, saveTo: (o, s) => s("ok") };
            const { comps } = await run("http://other.test/", repo);
            assert.equal(comps[0].id, comps[0].shortId());
            assert.isTrue(comps[0].id.startsWith("http://other.test/"));
        });

        it('generates versioned ids and saves through EcRepository when there is no repository', async () => {
            prepare(["a"]);
            const save = sinon.stub(EcRepository, 'save').callsFake((o, s) => s("ok"));
            const { comps } = await run(SERVER, null);
            assert.notEqual(comps[0].id, comps[0].shortId());
            assert.isTrue(save.calledOnce);
        });

        it('reports progress every INCREMENTAL_STEP saves and at the end', async () => {
            prepare(["a", "b", "c", "d", "e", "f"]);
            const repo = { selectedServer: SERVER, saveTo: (o, s) => s("ok") };
            const { progress } = await run(SERVER, repo);
            assert.deepEqual(progress, [{ competencies: 5 }, { competencies: 6 }]);
        });
    });
});
