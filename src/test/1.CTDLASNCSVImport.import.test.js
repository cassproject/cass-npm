require('../../index.js');
const chai = require('chai');
const sinon = require('sinon');
const EcRepository = require('../org/cassproject/ebac/repository/EcRepository.js');
const EcRemote = require('../com/eduworks/ec/remote/EcRemote.js');

const assert = chai.assert;

const SERVER = "http://repo.test/api/";
const repo = { selectedServer: SERVER };

// recast() normally expands and compacts through remote JSON-LD contexts. These tests replace it
// with an identity transform so the importer's own logic runs without the network.
function stubNetwork(terms, onRecast) {
    sinon.stub(EcRemote, 'getExpectingObject').resolves(terms || {});
    sinon.stub(EcRepository, 'get').resolves(null);
    sinon.stub(EcLinkedData.prototype, 'recast').callsFake(async function (translationContext, targetContext) {
        this.context = targetContext;
        if (onRecast) onRecast(this);
        return this;
    });
}

function importCsv(csv, opts) {
    opts = opts || {};
    return new Promise((resolve) => {
        const notes = [];
        CTDLASNCSVImport.importFrameworksAndCompetencies(opts.repo || repo, csv,
            (frameworks, competencies, relations) => resolve({ frameworks, competencies, relations, notes }),
            (e) => { if (Array.isArray(e)) resolve({ errors: e, notes }); else notes.push(e); },
            opts.ceo || null, opts.endpoint || null, new EcIdentityManager(), opts.collections, opts.skip, opts.validationRules, opts.duplicateChecks);
    });
}

const csvOf = (rows) => rows.map(r => r.join(",")).join("\n");

const FW_HEADER = ["@type", "@id", "ceterms:ctid", "ceasn:name", "ceasn:competencyText", "ceasn:isTopChildOf", "ceasn:isChildOf", "ceasn:broadAlignment", "ceterms:versionIdentifier", "ceasn:dateCreated"];

describe('CTDLASNCSVImport', () => {
    let savedTemplates;
    beforeEach(() => {
        savedTemplates = [EcFramework.template, EcCompetency.template];
    });
    afterEach(() => {
        sinon.restore();
        EcFramework.template = savedTemplates[0];
        EcCompetency.template = savedTemplates[1];
    });

    describe('analyzeFile', () => {
        const analyze = (csv) => new Promise((resolve) => {
            const failures = [];
            CTDLASNCSVImport.analyzeFile(csv, (f, c, k, d) => resolve({ f, c, k, d, failures }), (e) => {
                failures.push(e);
                if (e !== "Invalid file") resolve({ failures });
            });
        });

        it('counts types and lists rows that only differ by @id and CTID', async () => {
            const csv = csvOf([
                ["@type", "@id", "ceterms:ctid", "ceasn:competencyText", "ceasn:codedNotation"],
                [" ceasn:CompetencyFramework ", "http://f/1", "ce-1", "", ""],
                ["ceasn:Competency", "http://c/1", "ce-2", "Same", "A"],
                ["ceasn:Competency", "http://c/2", "ce-3", "Same", "A"],
                ["ceasn:Competency", "http://c/3", "ce-4", "Same", "A"],
                ["ceasn:Competency", "http://c/4", "ce-5", "Other", "B"],
                ["ceterms:Collection", "http://k/1", "ce-6", "", ""],
                ["sample row", "", "", "", ""],
                [""]
            ]);
            const { f, c, k, d, failures } = await analyze(csv);
            assert.deepEqual(failures, ["Invalid file"]);
            assert.equal(f, 1);
            assert.equal(c, 4);
            assert.equal(k, 1);
            // The first duplicate is listed once even though it has two copies.
            assert.deepEqual(d.map(x => [x.ctid, x.line]), [["ce-2", 2], ["ce-3", 3], ["ce-4", 4]]);
            assert.deepEqual(d.map(x => [x.competencyText, x.codedNotation]), [["Same", "A"], ["Same", "A"], ["Same", "A"]]);
        });

        it('reports unknown types', async () => {
            const { failures } = await analyze(csvOf([["@type", "@id"], ["ceasn:Nope", "http://x"]]));
            assert.deepEqual(failures, ["Invalid file", "Found unknown type:ceasn:Nope"]);
        });
    });

    describe('getIdFromCtid', () => {
        const CTX = "https://schema.cassproject.org/0.4/";
        it('appends the CTID to an endpoint, without the ce- prefix when the endpoint has one', () => {
            assert.equal(CTDLASNCSVImport.getIdFromCtid("ce-1234", "http://ep.test/resources/", repo, CTX, "Competency", "id"), "http://ep.test/resources/ce-1234");
            assert.equal(CTDLASNCSVImport.getIdFromCtid("ce-1234", "http://ep.test/resources/ce-", repo, CTX, "Competency", "id"), "http://ep.test/resources/ce-1234");
        });

        it('builds a versioned id for the id key and short ids for references', () => {
            const id = CTDLASNCSVImport.getIdFromCtid("ce-1234", null, repo, CTX, "Competency", "id");
            assert.isTrue(id.startsWith(SERVER + "data/schema.cassproject.org.0.4.Competency/1234/"));
            assert.equal(CTDLASNCSVImport.getIdFromCtid("ce-1234", null, repo, CTX, "Competency", "ceasn:isPartOf"), SERVER + "data/schema.cassproject.org.0.4.Framework/1234");
            assert.equal(CTDLASNCSVImport.getIdFromCtid("ce-1234", null, repo, CTX, "Concept", "ceasn:isTopChildOf"), SERVER + "data/schema.cassproject.org.0.4.ConceptScheme/1234");
            assert.equal(CTDLASNCSVImport.getIdFromCtid("ce-1234", null, repo, CTX, "Framework", "ceasn:hasChild"), SERVER + "data/schema.cassproject.org.0.4.Competency/1234");
            assert.equal(CTDLASNCSVImport.getIdFromCtid("ce-1234", null, repo, CTX, "ConceptScheme", "skos:hasTopConcept"), SERVER + "data/schema.cassproject.org.0.4.Concept/1234");
            assert.equal(CTDLASNCSVImport.getIdFromCtid("ce-1234", null, repo, CTX, "Competency", "ceasn:broadAlignment"), SERVER + "data/schema.cassproject.org.0.4.Competency/1234");
            assert.equal(CTDLASNCSVImport.getIdFromCtid("ce-1234", null, repo, CTX, "Thing", "ceasn:isPartOf"), SERVER + "data/schema.cassproject.org.0.4.Thing/1234");
        });
    });

    describe('cleanUpTranslator', () => {
        it('splits piped values, trims them and resolves CTIDs except in ceterms:ctid', () => {
            const t = {
                type: "ceasn:Competency",
                "ceasn:broadAlignment": "ce-1| http://x/2 ",
                "ceterms:ctid": "ce-9",
                "ceterms:keyword": "a|b",
                "ceasn:isChildOf": "ce-3",
                "ceasn:comment": ["ce-4", "plain"],
                "ceasn:empty": "",
                "ceasn:blank": "   ",
                " ceasn:padded ": "v"
            };
            CTDLASNCSVImport.cleanUpTranslator(t, "http://ep.test/", repo);
            assert.deepEqual(t, {
                type: "ceasn:Competency",
                "ceasn:broadAlignment": ["http://ep.test/ce-1", "http://x/2"],
                "ceterms:ctid": "ce-9",
                "ceterms:keyword": ["a", "b"],
                "ceasn:isChildOf": "http://ep.test/ce-3",
                "ceasn:comment": ["http://ep.test/ce-4", "plain"],
                "ceasn:padded": "v"
            });
        });

        it('keeps a piped ceterms:ctid unresolved', () => {
            const t = { type: "ceasn:Competency", "ceterms:ctid": "ce-1|ce-2" };
            CTDLASNCSVImport.cleanUpTranslator(t, "http://ep.test/", repo);
            assert.deepEqual(t["ceterms:ctid"], ["ce-1", "ce-2"]);
        });
    });

    describe('createRelations', () => {
        const run = (value, endpoint) => {
            const e = { id: "http://c/1", "ceasn:isPartOf": "http://f/1", "ceasn:broadAlignment": value };
            const relations = [];
            const relationById = {};
            const frameworks = { "http://f/1": { relation: [] } };
            CTDLASNCSVImport.createRelations(e, "ceasn:broadAlignment", "narrows", repo, null, new EcIdentity(), relations, relationById, frameworks, endpoint);
            return { e, relations, relationById, frameworks };
        };

        it('wraps a single value in an array', () => {
            const { e, relations, frameworks } = run("http://c/2");
            assert.deepEqual(e["ceasn:broadAlignment"], ["http://c/2"]);
            assert.deepEqual(relations.map(r => [r.source, r.target, r.relationType]), [["http://c/1", "http://c/2", "narrows"]]);
            assert.notEqual(relations[0].id, relations[0].shortId());
            assert.deepEqual(frameworks["http://f/1"].relation, [relations[0].shortId()]);
        });

        it('creates one relation per array entry, resolving CTIDs, with short ids for an endpoint', () => {
            const { relations, relationById } = run(["http://c/2", "ce-3"], "http://ep.test/");
            assert.deepEqual(relations.map(r => r.target), ["http://c/2", "http://ep.test/ce-3"]);
            for (const r of relations) {
                assert.equal(r.id, r.shortId());
                assert.equal(relationById[r.shortId()], r);
            }
        });

        it('treats a numeric value as an array length and then fails on the empty slots', () => {
            const e = { id: "http://c/1", "ceasn:isPartOf": "http://f/1", "ceasn:broadAlignment": 2 };
            assert.throws(() => CTDLASNCSVImport.createRelations(e, "ceasn:broadAlignment", "narrows", repo, null, new EcIdentity(), [], {}, { "http://f/1": { relation: [] } }, null), TypeError);
            assert.lengthOf(e["ceasn:broadAlignment"], 2);
            assert.isFalse(0 in e["ceasn:broadAlignment"]);
        });
    });

    describe('validateFrameworkHierarchy', () => {
        const rules = {
            "ceasn:Competency": { requiredProperties: ["ceasn:isPartOf"], childProperties: ["ceasn:isChildOf", "ceasn:hasChild"], errorMessage: "custom" },
            "ceasn:CompetencyFramework": { requiredProperties: ["ceasn:hasTopChild"] }
        };

        it('requires rules', () => {
            assert.equal(CTDLASNCSVImport.validateFrameworkHierarchy([], null), 'Hierarchy rules not defined.');
        });

        it('ignores types that are not present', () => {
            assert.isNull(CTDLASNCSVImport.validateFrameworkHierarchy([null, { "@type": "x" }], rules));
        });

        it('passes when a row of the type has a required property', () => {
            assert.isNull(CTDLASNCSVImport.validateFrameworkHierarchy([{ "@type": "ceasn:Competency", "ceasn:isPartOf": "x" }], { "ceasn:Competency": rules["ceasn:Competency"] }));
        });

        it('passes when any typed row has a child property', () => {
            assert.isNull(CTDLASNCSVImport.validateFrameworkHierarchy([{ "@type": "ceasn:Competency" }, { "@type": "other", "ceasn:hasChild": "y" }], { "ceasn:Competency": rules["ceasn:Competency"] }));
        });

        it('ignores child properties on rows without a type', () => {
            const data = [{ "@type": "ceasn:Competency" }, { "ceasn:hasChild": "y" }, null, { "@type": "", "ceasn:hasChild": "y" }];
            assert.equal(CTDLASNCSVImport.validateFrameworkHierarchy(data, { "ceasn:Competency": rules["ceasn:Competency"] }), "custom");
        });

        it('ignores required properties on rows of another type', () => {
            const data = [{ "@type": "ceasn:CompetencyFramework" }, { "@type": "other", "ceasn:hasTopChild": "x" }];
            assert.equal(CTDLASNCSVImport.validateFrameworkHierarchy(data, rules), "CSV must contain hierarchy properties for ceasn:CompetencyFramework");
        });

        it('checks every type in order and returns the first failure', () => {
            const data = [{ "@type": "ceasn:Competency" }, { "@type": "ceasn:CompetencyFramework" }];
            assert.equal(CTDLASNCSVImport.validateFrameworkHierarchy(data, rules), "custom");
            data[0]["ceasn:isPartOf"] = "x";
            assert.equal(CTDLASNCSVImport.validateFrameworkHierarchy(data, rules), "CSV must contain hierarchy properties for ceasn:CompetencyFramework");
        });

        it('works with rules that only have one kind of property', () => {
            assert.isNull(CTDLASNCSVImport.validateFrameworkHierarchy([{ "@type": "t", c: 1 }], { t: { childProperties: ["c"] } }));
            assert.equal(CTDLASNCSVImport.validateFrameworkHierarchy([{ "@type": "t", c: 1 }], { t: {} }), "CSV must contain hierarchy properties for t");
        });

        it('keeps scanning after one property is found and throws on non-iterable rules', () => {
            const data = [{ "@type": "other", c: 1 }, { "@type": "t" }];
            assert.throws(() => CTDLASNCSVImport.validateFrameworkHierarchy(data, { t: { childProperties: ["c"], requiredProperties: 5 } }), TypeError);
            assert.isNull(CTDLASNCSVImport.validateFrameworkHierarchy([{ "@type": "t", r: 1, c: 1 }, { "@type": "t" }], { t: { childProperties: ["c"], requiredProperties: ["r"], x: 5 } }));
        });
    });

    describe('importFrameworksAndCompetencies', () => {
        const frameworkCsv = () => csvOf([
            FW_HEADER,
            ["ceasn:CompetencyFramework", "http://fw.test/F1", "ce-f1", "Framework", "", "", "", "", "1.0~Version~http://t", ""],
            ["ceasn:Competency", "http://fw.test/C1", "ce-c1", "", "Comp one", "http://fw.test/F1", "", "http://other.test/X", "", ""],
            ["ceasn:Competency", "http://fw.test/C2", "ce-c2", "", "Comp two", "", "http://fw.test/C1", "http://other.test/Y|http://other.test/Z", "", "2020-01-01"]
        ]);

        it('imports frameworks, competencies and relations', async () => {
            stubNetwork();
            const { frameworks, competencies, relations, notes } = await importCsv(frameworkCsv());
            assert.deepEqual(notes, ["Invalid file"]);
            assert.lengthOf(frameworks, 1);
            const fw = frameworks[0];
            assert.equal(fw.id, "http://fw.test/F1");
            assert.deepEqual(fw.competency, ["http://fw.test/C1", "http://fw.test/C2"]);
            assert.deepEqual(fw["ceterms:versionIdentifier"], [{
                "ceterms:identifierValueCode": "1.0",
                "ceterms:identifierTypeName": { "@language": "en-us", "@value": "Version" },
                "ceterms:identifierType": "http://t"
            }]);
            assert.deepEqual(competencies.map(c => c.id), ["http://fw.test/C1", "http://fw.test/C2"]);
            assert.deepEqual(relations.map(r => [r.source, r.relationType, r.target]), [
                ["http://fw.test/C1", "narrows", "http://other.test/X"],
                ["http://fw.test/C2", "narrows", "http://fw.test/C1"],
                ["http://fw.test/C2", "narrows", "http://other.test/Y"],
                ["http://fw.test/C2", "narrows", "http://other.test/Z"]
            ]);
            assert.deepEqual(fw.relation, relations.map(r => r.shortId()));
            for (const r of relations) {
                assert.isTrue(r.id.startsWith(SERVER));
                assert.notEqual(r.id, r.shortId());
            }
            assert.isUndefined(fw["schema:dateCreated"]);
            assert.isUndefined(competencies[0]["schema:dateCreated"]);
        });

        it('renames columns through the terms map', async () => {
            stubNetwork({ "ceasn:competencyText": "ceasn:renamedText" });
            const { competencies } = await importCsv(frameworkCsv());
            assert.equal(competencies[0]["ceasn:renamedText"], "Comp one");
            assert.isUndefined(competencies[0]["ceasn:competencyText"]);
        });

        it('applies template owners and creation dates', async () => {
            stubNetwork();
            EcFramework.template = { "schema:dateCreated": "TEMPLATE", "ceasn:extra": "E" };
            EcCompetency.template = { "@owner": "OWNER", "schema:dateCreated": "TEMPLATE" };
            const { frameworks, competencies } = await importCsv(frameworkCsv());
            assert.equal(frameworks[0]["ceasn:extra"], "E");
            assert.match(frameworks[0]["schema:dateCreated"], /^\d{4}-\d\d-\d\dT/);
            assert.equal(competencies[0].owner, "OWNER");
            assert.match(competencies[0]["schema:dateCreated"], /^\d{4}-\d\d-\d\dT/);
            // A row with its own creation date keeps it.
            assert.isUndefined(competencies[1]["schema:dateCreated"]);
        });

        it('leaves dates alone when the templates have no creation date', async () => {
            stubNetwork();
            EcFramework.template = {};
            EcCompetency.template = {};
            const { frameworks, competencies } = await importCsv(frameworkCsv());
            assert.isUndefined(frameworks[0]["schema:dateCreated"]);
            assert.isUndefined(competencies[0]["schema:dateCreated"]);
            assert.isUndefined(competencies[0].owner);
        });

        it('creates short relation ids for an endpoint', async () => {
            stubNetwork();
            const { relations } = await importCsv(frameworkCsv(), { endpoint: "http://ep.test/" });
            for (const r of relations) {
                assert.isTrue(r.id.startsWith("http://ep.test/"));
                assert.equal(r.id, r.shortId());
            }
        });

        it('drops version identifiers that are not strings, leaving a hole', async () => {
            stubNetwork(null, (t) => {
                if (t.id === "http://fw.test/F1") t["ceterms:versionIdentifier"] = ["1.0~V", 5];
            });
            const { frameworks } = await importCsv(frameworkCsv());
            const v = frameworks[0]["ceterms:versionIdentifier"];
            assert.lengthOf(v, 2);
            assert.isFalse(1 in v);
            assert.deepEqual(v[0], { "ceterms:identifierValueCode": "1.0", "ceterms:identifierTypeName": { "@language": "en-us", "@value": "V" }, "ceterms:identifierType": undefined });
        });

        it('skips sample and instruction rows and reports missing fields', async () => {
            stubNetwork();
            const csv = csvOf([
                ["@type", "@id", "ceasn:name"],
                ["Sample row", "", ""],
                ["INSTRUCTIONS", "", ""],
                ["", "", "no type"],
                ["ceasn:Competency", "bad", ""],
                ["ceasn:Unknown", "http://x/1", ""]
            ]);
            const { errors } = await importCsv(csv);
            assert.deepEqual(errors, [
                "Row 4: is missing an @id",
                "Row 4: is missing a @type",
                "Row 5: @id must be a valid URI or start with 'ce-'",
                "Row 6: Found unknown type:ceasn:Unknown"
            ]);
        });

        it('fails on a CSV that ends with a newline (cassproject/cass-npm#542)', async () => {
            stubNetwork();
            const { errors } = await importCsv(frameworkCsv() + "\n");
            assert.deepEqual(errors, ["Row 5: is missing an @id", "Row 5: is missing a @type"]);
        });

        it('applies required-property and registry-url validation rules', async () => {
            stubNetwork();
            const validationRules = {
                validateHierarchy: false,
                requiredProps: { "ceasn:CompetencyFramework": ["ceasn:name"], "ceasn:Competency": ["ceasn:competencyText"] },
                urlRules: { fields: { "ceasn:CompetencyFramework": ["ceasn:publisher"], "ceasn:Competency": ["ceasn:creator"] }, allowedOrigins: ["https://ok.test"] }
            };
            const csv = csvOf([
                ["@type", "@id", "ceasn:name", "ceasn:competencyText", "ceasn:publisher", "ceasn:creator", "ceasn:isTopChildOf"],
                ["ceasn:CompetencyFramework", "http://f/1", "", "", "", "", ""],
                ["ceasn:CompetencyFramework", "http://f/2", "Two", "", "https://bad.test/x", "", ""],
                ["ceasn:CompetencyFramework", "http://f/3", "Three", "", "https://ok.test/x", "", ""],
                ["ceasn:Competency", "http://c/1", "", "", "", "", "http://f/3"],
                ["ceasn:Competency", "http://c/2", "", "Text", "", "https://bad.test/y", "http://f/3"]
            ]);
            const { errors } = await importCsv(csv, { validationRules });
            assert.deepEqual(errors, [
                "Row 2: Missing required properties for ceasn:CompetencyFramework: ceasn:name",
                "Row 3: ceasn:publisher must be a CTID or a credential registry URL for this environment (got: https://bad.test/x)",
                "Row 5: Missing required properties for ceasn:Competency: ceasn:competencyText",
                "Row 6: ceasn:creator must be a CTID or a credential registry URL for this environment (got: https://bad.test/y)"
            ]);
        });

        it('passes when the validation rules are satisfied', async () => {
            stubNetwork();
            const validationRules = {
                hierarchyRules: { "ceasn:Competency": { requiredProperties: ["ceasn:isTopChildOf"] } },
                requiredProps: { "ceasn:Competency": ["ceasn:competencyText"] },
                urlRules: { fields: {}, allowedOrigins: ["https://ok.test"] }
            };
            const { competencies } = await importCsv(frameworkCsv(), { validationRules });
            assert.lengthOf(competencies, 2);
        });

        it('skips rows by CTID and replaces skipped CTIDs in the remaining rows', async () => {
            stubNetwork();
            const csv = csvOf([
                ["@type", "@id", "ceterms:CTID", "ceasn:competencyText", "ceasn:isTopChildOf", "ceasn:comment"],
                ["ceasn:CompetencyFramework", "http://fw.test/F1", "ce-f1", "", "", ""],
                ["ceasn:Competency", "http://fw.test/aaa", "ce-aaa", "A", "http://fw.test/F1", "see aaa"],
                ["ceasn:Competency", "http://fw.test/bbb", "ce-bbb", "B", "http://fw.test/F1", "see bbb"],
                ["ceasn:Competency", "http://fw.test/ccc", "ce-ccc", "C", "http://fw.test/F1", "see bbb"]
            ]);
            const { competencies } = await importCsv(csv, { skip: [{ ctid: "ce-bbb", replaceWith: "ce-zzz" }, "ce-aaa"] });
            assert.deepEqual(competencies.map(c => c.id), ["http://fw.test/ccc"]);
            assert.equal(competencies[0]["ceasn:comment"], "see zzz");
            assert.equal(competencies[0]["ceterms:ctid"], "ce-ccc");
        });

        it('does not skip a row whose CTID matches a falsy skip entry', async () => {
            stubNetwork();
            const csv = csvOf([
                ["@type", "@id", "ceterms:ctid", "ceasn:competencyText", "ceasn:isTopChildOf"],
                ["ceasn:CompetencyFramework", "http://fw.test/F1", "ce-f1", "", ""],
                ["ceasn:Competency", "http://fw.test/aaa", "", "A", "http://fw.test/F1"]
            ]);
            const { competencies } = await importCsv(csv, { skip: ["", { ctid: "ce-zzz" }] });
            assert.deepEqual(competencies.map(c => c.id), ["http://fw.test/aaa"]);
        });

        it('reports competencies whose id already exists as another type', async () => {
            stubNetwork();
            EcRepository.get.resolves({ type: "Competency" });
            const { errors } = await importCsv(frameworkCsv());
            assert.equal(errors[0], "Row 2: http://fw.test/F1 already exists as a Competency");
        });

        it('passes duplicate-check results through', async () => {
            stubNetwork();
            const seen = [];
            const check = async (r, ids, fws, ctids) => { seen.push([r, ids, fws.length, ctids]); return ["dup"]; };
            const { errors } = await importCsv(frameworkCsv(), { duplicateChecks: [check] });
            assert.deepEqual(errors, ["dup"]);
            assert.equal(seen[0][0], repo);
            assert.deepEqual(seen[0][1], ["http://fw.test/C1", "http://fw.test/C2"]);
            assert.equal(seen[0][2], 1);
            assert.deepEqual(seen[0][3], { "http://fw.test/C1": "ce-c1", "http://fw.test/C2": "ce-c2" });
        });
    });

    describe('importCollectionsAndCompetencies', () => {
        const header = ["@type", "@id", "ceterms:ctid", "ceasn:name", "ceasn:competencyText", "ceterms:isMemberOf", "ceasn:broadAlignment"];
        const collectionCsv = () => csvOf([
            header,
            ["ceterms:Collection", "http://col.test/K1", "ce-k1", "Collection", "", "", ""],
            ["ceasn:Competency", "http://col.test/C1", "ce-c1", "", "One", "http://col.test/K1", "http://other.test/X"],
            ["ceasn:Competency", "http://col.test/C2", "ce-c2", "", "Two", "http://col.test/K9", ""]
        ]);

        it('imports collections, members and relations', async () => {
            stubNetwork();
            const { frameworks, competencies, relations } = await importCsv(collectionCsv(), { collections: true });
            assert.lengthOf(frameworks, 1);
            assert.equal(frameworks[0].subType, "Collection");
            assert.deepEqual(frameworks[0].competency, ["http://col.test/C1"]);
            assert.deepEqual(competencies.map(c => c.id), ["http://col.test/C1", "http://col.test/C2"]);
            assert.deepEqual(relations.map(r => [r.source, r.target]), [["http://col.test/C1", "http://other.test/X"]]);
            assert.deepEqual(frameworks[0].relation, [relations[0].shortId()]);
            // Neither the known collection (no owner) nor the unknown one gives the members an owner.
            assert.isUndefined(competencies[0].owner);
            assert.isUndefined(competencies[1].owner);
        });

        it('applies template owners and creation dates', async () => {
            stubNetwork();
            EcFramework.template = { "@owner": ["TEMPLATE"], "schema:dateCreated": "TEMPLATE" };
            EcCompetency.template = { "@owner": "OWNER", "schema:dateCreated": "TEMPLATE" };
            const { frameworks, competencies } = await importCsv(collectionCsv(), { collections: true });
            assert.deepEqual(frameworks[0].owner, ["TEMPLATE"]);
            assert.match(frameworks[0]["schema:dateCreated"], /^\d{4}-\d\d-\d\dT/);
            assert.equal(competencies[0].owner, "OWNER");
            assert.match(competencies[0]["schema:dateCreated"], /^\d{4}-\d\d-\d\dT/);
        });

        it('leaves dates alone when the templates have no creation date', async () => {
            stubNetwork();
            EcFramework.template = {};
            EcCompetency.template = {};
            const { frameworks, competencies } = await importCsv(collectionCsv(), { collections: true });
            assert.isUndefined(frameworks[0]["schema:dateCreated"]);
            assert.isUndefined(competencies[0]["schema:dateCreated"]);
        });

        it('applies required-property and registry-url validation rules', async () => {
            stubNetwork();
            const validationRules = {
                validateHierarchy: false,
                requiredProps: { "ceterms:Collection": ["ceasn:name"], "ceterms:Collection:Competency": ["ceasn:competencyText"] },
                urlRules: { fields: { "ceterms:Collection": ["ceasn:publisher"], "ceasn:Competency": ["ceasn:creator"] }, allowedOrigins: ["https://ok.test"] }
            };
            const csv = csvOf([
                ["@type", "@id", "ceasn:name", "ceasn:competencyText", "ceasn:publisher", "ceasn:creator", "ceterms:isMemberOf"],
                ["ceterms:Collection", "http://k/1", "", "", "", "", ""],
                ["ceterms:Collection", "http://k/2", "Two", "", "https://bad.test/x", "", ""],
                ["ceasn:Competency", "http://c/1", "", "", "", "", "http://k/2"],
                ["ceasn:Competency", "http://c/2", "", "Text", "", "https://bad.test/y", "http://k/2"]
            ]);
            const { errors } = await importCsv(csv, { collections: true, validationRules });
            assert.deepEqual(errors, [
                "Row 2: Missing required properties for ceterms:Collection: ceasn:name",
                "Row 3: ceasn:publisher must be a CTID or a credential registry URL for this environment (got: https://bad.test/x)",
                "Row 4: Missing required properties for ceterms:Collection:Competency: ceasn:competencyText",
                "Row 5: ceasn:creator must be a CTID or a credential registry URL for this environment (got: https://bad.test/y)"
            ]);
        });

        it('skips rows by CTID, including a falsy-entry edge case', async () => {
            stubNetwork();
            let r = await importCsv(collectionCsv(), { collections: true, skip: [{ ctid: "ce-c1" }] });
            assert.deepEqual(r.competencies.map(c => c.id), ["http://col.test/C2"]);
            r = await importCsv(collectionCsv(), { collections: true, skip: ["ce-c2"] });
            assert.deepEqual(r.competencies.map(c => c.id), ["http://col.test/C1"]);
            const csv = csvOf([
                ["@type", "@id", "ceterms:ctid", "ceasn:competencyText", "ceterms:isMemberOf"],
                ["ceasn:Competency", "http://col.test/C1", "", "One", "http://col.test/K1"]
            ]);
            r = await importCsv(csv, { collections: true, skip: ["", { ctid: "ce-zzz" }] });
            assert.deepEqual(r.competencies.map(c => c.id), ["http://col.test/C1"]);
        });
    });
});
