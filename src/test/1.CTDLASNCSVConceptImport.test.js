require('../../index.js');
const chai = require('chai');
const sinon = require('sinon');
const EcRepository = require('../org/cassproject/ebac/repository/EcRepository.js');
const EcRemote = require('../com/eduworks/ec/remote/EcRemote.js');

const assert = chai.assert;

const SERVER = "http://repo.test/api/";
const repo = { selectedServer: SERVER };
const isNode = typeof process === 'object' && process.versions != null && process.versions.node != null && typeof window === 'undefined';

// recast() normally expands and compacts through remote JSON-LD contexts. Most tests replace it
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
        CTDLASNCSVConceptImport.importFrameworksAndCompetencies(repo, csv,
            (schemes, concepts) => resolve({ schemes, concepts, notes }),
            (e) => { if (Array.isArray(e)) resolve({ errors: e, notes }); else notes.push(e); },
            null, opts.endpoint || null, new EcIdentityManager(), opts.progressions, opts.validationRules, opts.duplicateChecks);
    });
}

const csvOf = (rows) => rows.map(r => r.join(",")).join("\n");

const conceptCsv = () => csvOf([
    ["@type", "@id", "ceterms:ctid", "ceasn:name", "skos:prefLabel", "skos:topConceptOf", "skos:inScheme", "ceterms:versionIdentifier", "ceasn:dateCreated", "skos:broader"],
    ["skos:ConceptScheme", "http://cs.test/S1", "ce-s1", "Scheme", "", "", "", "1.0~V~http://t", "", ""],
    ["skos:ConceptScheme", "http://cs.test/S2", "ce-s2", "Scheme two", "", "", "", "", "2020-01-01", ""],
    ["skos:Concept", "http://cs.test/K1", "ce-k1", "", "One", "http://cs.test/S1", "", "", "", ""],
    ["skos:Concept", "http://cs.test/K2", "", "", "Two", "", "http://cs.test/S2", "", "2020-01-01", "http://cs.test/K1"],
    ["skos:Concept", "http://cs.test/K3", "ce-k3", "", "Three", "http://cs.test/S1", "http://cs.test/S1", "", "", ""],
    ["skos:Concept", "http://cs.test/K4", "ce-k4", "", "Four", "http://cs.test/S9", "http://cs.test/S9", "", "", ""]
]);

const progressionCsv = () => csvOf([
    ["@type", "@id", "ceasn:name", "skos:prefLabel", "skos:topConceptOf", "skos:inScheme", "ceasn:dateCreated", "skos:broader"],
    ["asn:ProgressionModel", "http://pm.test/M1", "Model", "", "", "", "", ""],
    ["asn:ProgressionModel", "http://pm.test/M2", "Model two", "", "", "", "2020-01-01", ""],
    ["asn:ProgressionLevel", "http://pm.test/L1", "", "One", "http://pm.test/M1", "", "", ""],
    ["asn:ProgressionLevel", "http://pm.test/L2", "", "Two", "", "http://pm.test/M2", "2020-01-01", "http://pm.test/L1"],
    ["asn:ProgressionLevel", "http://pm.test/L3", "", "Three", "http://pm.test/M1", "http://pm.test/M1", "", ""],
    ["asn:ProgressionLevel", "http://pm.test/L4", "", "Four", "http://pm.test/M9", "http://pm.test/M9", "", ""]
]);

describe('CTDLASNCSVConceptImport', () => {
    let savedTemplates;
    beforeEach(() => {
        savedTemplates = [EcConceptScheme.template, EcConcept.template];
    });
    afterEach(() => {
        sinon.restore();
        EcConceptScheme.template = savedTemplates[0];
        EcConcept.template = savedTemplates[1];
    });

    describe('concept schemes', () => {
        it('imports schemes and concepts and links top concepts', async () => {
            stubNetwork();
            const { schemes, concepts, notes } = await importCsv(conceptCsv());
            assert.deepEqual(notes, ["Invalid file"]);
            assert.deepEqual(schemes.map(s => s.id), ["http://cs.test/S1", "http://cs.test/S2"]);
            assert.deepEqual(concepts.map(c => c.id), ["http://cs.test/K1", "http://cs.test/K2", "http://cs.test/K3", "http://cs.test/K4"]);
            assert.deepEqual(schemes[0]["skos:hasTopConcept"], ["http://cs.test/K1", "http://cs.test/K3"]);
            // skos:inScheme also adds the concept to the scheme's top concepts.
            assert.deepEqual(schemes[1]["skos:hasTopConcept"], ["http://cs.test/K2"]);
            assert.deepEqual(concepts[1]["skos:broader"], ["http://cs.test/K1"]);
            assert.deepEqual(schemes[0]["ceasn:name"], { "en-US": "Scheme" });
            assert.deepEqual(concepts[0]["skos:prefLabel"], { "en-US": "One" });
            assert.deepEqual(schemes[0]["ceterms:versionIdentifier"], [{
                "ceterms:identifierValueCode": "1.0",
                "ceterms:identifierTypeName": { "@language": "en-us", "@value": "V" },
                "ceterms:identifierType": "http://t"
            }]);
            assert.isUndefined(schemes[0]["schema:dateCreated"]);
            assert.isUndefined(concepts[0]["schema:dateCreated"]);
            assert.isUndefined(schemes[0].subType);
        });

        it('applies template owners and creation dates', async () => {
            stubNetwork();
            EcConceptScheme.template = { "@owner": ["T"], "schema:dateCreated": "TEMPLATE", "ceasn:extra": "E" };
            EcConcept.template = { "@owner": "OWNER", "schema:dateCreated": "TEMPLATE" };
            const { schemes, concepts } = await importCsv(conceptCsv());
            assert.deepEqual(schemes[0].owner, ["T"]);
            assert.equal(schemes[0]["ceasn:extra"], "E");
            assert.match(schemes[0]["schema:dateCreated"], /^\d{4}-\d\d-\d\dT/);
            // A row with its own creation date keeps the template value.
            assert.equal(schemes[1]["schema:dateCreated"], "TEMPLATE");
            assert.equal(concepts[0].owner, "OWNER");
            assert.match(concepts[0]["schema:dateCreated"], /^\d{4}-\d\d-\d\dT/);
            assert.isUndefined(concepts[1]["schema:dateCreated"]);
        });

        it('leaves owners and dates alone when the templates do not set them', async () => {
            stubNetwork();
            EcConceptScheme.template = {};
            EcConcept.template = {};
            const { schemes, concepts } = await importCsv(conceptCsv());
            assert.isUndefined(schemes[0]["schema:dateCreated"]);
            assert.isUndefined(concepts[0].owner);
            assert.isUndefined(concepts[0]["schema:dateCreated"]);
        });

        it('drops version identifiers that are not strings, leaving a hole', async () => {
            stubNetwork(null, (t) => {
                if (t.id === "http://cs.test/S1") t["ceterms:versionIdentifier"] = ["1.0~V", 5];
            });
            const { schemes } = await importCsv(conceptCsv());
            const v = schemes[0]["ceterms:versionIdentifier"];
            assert.lengthOf(v, 2);
            assert.isFalse(1 in v);
            assert.equal(v[0]["ceterms:identifierValueCode"], "1.0");
        });

        it('renames columns through the terms map', async () => {
            stubNetwork({ "skos:prefLabel": "skos:altLabel" });
            const { concepts } = await importCsv(conceptCsv());
            assert.deepEqual(concepts[0]["skos:altLabel"], { "en-US": "One" });
            assert.isUndefined(concepts[0]["skos:prefLabel"]);
        });

        it('reports missing fields, unknown types and missing ids', async () => {
            stubNetwork(null, (t) => {
                if (t.id === "http://cs.test/noid") delete t.id;
            });
            const csv = csvOf([
                ["@type", "@id", "ceasn:name"],
                ["Sample", "x", ""],
                ["", "", ""],
                ["skos:Concept", "bad", ""],
                ["skos:Other", "http://x/1", ""],
                ["skos:Concept", "http://cs.test/noid", ""]
            ]);
            const { errors } = await importCsv(csv);
            assert.deepEqual(errors, [
                // The @id is checked before sample rows are skipped.
                "Row 2: @id must be a valid URI or start with 'ce-'",
                "Row 3: is missing an @id",
                "Row 3: is missing a @type",
                "Row 4: @id must be a valid URI or start with 'ce-'",
                "Row 5: Found unknown type: skos:Other",
                "Row 6: Concept is missing an id"
            ]);
        });

        it('applies required-property and registry-url validation rules', async () => {
            stubNetwork();
            const validationRules = {
                validateHierarchy: false,
                requiredProps: { "skos:ConceptScheme": ["ceasn:name"], "skos:Concept": ["skos:prefLabel"] },
                urlRules: { fields: { "skos:ConceptScheme": ["ceasn:publisher"], "skos:Concept": ["ceasn:creator"] }, allowedOrigins: ["https://ok.test"] }
            };
            const csv = csvOf([
                ["@type", "@id", "ceasn:name", "skos:prefLabel", "ceasn:publisher", "ceasn:creator"],
                ["skos:ConceptScheme", "http://s/1", "", "", "", ""],
                ["skos:ConceptScheme", "http://s/2", "Two", "", "https://bad.test/x", ""],
                ["skos:Concept", "http://c/1", "", "", "", ""],
                ["skos:Concept", "http://c/2", "", "Label", "", "https://bad.test/y"],
                ["skos:Concept", "http://c/3", "", "Label", "", "https://ok.test/y"]
            ]);
            const { errors } = await importCsv(csv, { validationRules });
            assert.deepEqual(errors, [
                "Row 2: Missing required properties for skos:ConceptScheme: ceasn:name",
                "Row 3: ceasn:publisher must be a CTID or a credential registry URL for this environment (got: https://bad.test/x)",
                "Row 4: Missing required properties for skos:Concept: skos:prefLabel",
                "Row 5: ceasn:creator must be a CTID or a credential registry URL for this environment (got: https://bad.test/y)"
            ]);
        });

        it('runs hierarchy validation unless it is turned off', async () => {
            stubNetwork();
            const hierarchyRules = { "skos:Concept": { requiredProperties: ["skos:nope"], errorMessage: "no hierarchy" } };
            let r = await importCsv(conceptCsv(), { validationRules: { hierarchyRules } });
            assert.deepEqual(r.errors, ["no hierarchy"]);
            r = await importCsv(conceptCsv(), { validationRules: { hierarchyRules: { "skos:Concept": { requiredProperties: ["skos:topConceptOf"] } } } });
            assert.lengthOf(r.concepts, 4);
        });

        it('passes duplicate-check results through', async () => {
            stubNetwork();
            const seen = [];
            const check = async (r, ids, schemes, ctids) => { seen.push([r, ids, schemes.length, ctids]); return ["dup"]; };
            const { errors } = await importCsv(conceptCsv(), { duplicateChecks: [check] });
            assert.deepEqual(errors, ["dup"]);
            assert.equal(seen[0][0], repo);
            assert.deepEqual(seen[0][1], ["http://cs.test/K1", "http://cs.test/K2", "http://cs.test/K3", "http://cs.test/K4"]);
            assert.equal(seen[0][2], 2);
            assert.deepEqual(seen[0][3], { "http://cs.test/K1": "ce-k1", "http://cs.test/K2": "http://cs.test/K2", "http://cs.test/K3": "ce-k3", "http://cs.test/K4": "ce-k4" });
        });
    });

    describe('progressions', () => {
        it('imports progression models and levels and links top levels', async () => {
            stubNetwork();
            const { schemes, concepts } = await importCsv(progressionCsv(), { progressions: true });
            assert.deepEqual(schemes.map(s => [s.id, s.subType]), [["http://pm.test/M1", "Progression"], ["http://pm.test/M2", "Progression"]]);
            assert.deepEqual(concepts.map(c => [c.id, c.subType]), [
                ["http://pm.test/L1", "Progression"], ["http://pm.test/L2", "Progression"], ["http://pm.test/L3", "Progression"], ["http://pm.test/L4", "Progression"]
            ]);
            assert.deepEqual(schemes[0]["skos:hasTopConcept"], ["http://pm.test/L1", "http://pm.test/L3"]);
            assert.deepEqual(schemes[1]["skos:hasTopConcept"], ["http://pm.test/L2"]);
            assert.deepEqual(concepts[1]["skos:broader"], ["http://pm.test/L1"]);
            assert.isUndefined(schemes[0]["schema:dateCreated"]);
        });

        it('applies template owners and creation dates', async () => {
            stubNetwork();
            EcConceptScheme.template = { "@owner": ["T"], "schema:dateCreated": "TEMPLATE" };
            EcConcept.template = { "@owner": "OWNER", "schema:dateCreated": "TEMPLATE" };
            const { schemes, concepts } = await importCsv(progressionCsv(), { progressions: true });
            assert.deepEqual(schemes[0].owner, ["T"]);
            assert.match(schemes[0]["schema:dateCreated"], /^\d{4}-\d\d-\d\dT/);
            // A row with its own creation date keeps the template value.
            assert.equal(schemes[1]["schema:dateCreated"], "TEMPLATE");
            assert.equal(concepts[0].owner, "OWNER");
            assert.match(concepts[0]["schema:dateCreated"], /^\d{4}-\d\d-\d\dT/);
            assert.isUndefined(concepts[1]["schema:dateCreated"]);
        });

        it('leaves owners and dates alone when the templates do not set them', async () => {
            stubNetwork();
            EcConceptScheme.template = {};
            EcConcept.template = {};
            const { schemes, concepts } = await importCsv(progressionCsv(), { progressions: true });
            assert.isUndefined(schemes[0]["schema:dateCreated"]);
            assert.isUndefined(concepts[0].owner);
            assert.isUndefined(concepts[0]["schema:dateCreated"]);
        });

        it('applies required-property and registry-url validation rules', async () => {
            stubNetwork();
            const validationRules = {
                validateHierarchy: false,
                requiredProps: { "asn:ProgressionModel": ["ceasn:name"], "asn:ProgressionLevel": ["skos:prefLabel"] },
                urlRules: { fields: { "asn:ProgressionModel": ["ceasn:publisher"], "asn:ProgressionLevel": ["ceasn:creator"] }, allowedOrigins: ["https://ok.test"] }
            };
            const csv = csvOf([
                ["@type", "@id", "ceasn:name", "skos:prefLabel", "ceasn:publisher", "ceasn:creator"],
                ["asn:ProgressionModel", "http://m/1", "", "", "", ""],
                ["asn:ProgressionModel", "http://m/2", "Two", "", "https://bad.test/x", ""],
                ["asn:ProgressionLevel", "http://l/1", "", "", "", ""],
                ["asn:ProgressionLevel", "http://l/2", "", "Label", "", "https://bad.test/y"],
                ["asn:ProgressionLevel", "http://l/3", "", "Label", "", ""],
                ["Instructions", "", "", "", "", ""],
                ["asn:Other", "x", "", "", "", ""],
                ["", "", "", "", "", ""]
            ]);
            const { errors } = await importCsv(csv, { progressions: true, validationRules });
            assert.deepEqual(errors, [
                "Row 2: Missing required properties for asn:ProgressionModel: ceasn:name",
                "Row 3: ceasn:publisher must be a CTID or a credential registry URL for this environment (got: https://bad.test/x)",
                "Row 4: Missing required properties for asn:ProgressionLevel: skos:prefLabel",
                "Row 5: ceasn:creator must be a CTID or a credential registry URL for this environment (got: https://bad.test/y)",
                "Row 7: is missing an @id",
                "Row 8: Found unknown type: asn:Other",
                "Row 9: is missing an @id",
                "Row 9: is missing a @type"
            ]);
        });

        it('does not pass duplicate checks through to the progression import', async () => {
            stubNetwork();
            const check = sinon.stub().resolves(["dup"]);
            const { schemes } = await importCsv(progressionCsv(), { progressions: true, duplicateChecks: [check] });
            assert.lengthOf(schemes, 2);
            assert.isFalse(check.called);
        });

        it('runs duplicate checks when called directly', async () => {
            stubNetwork();
            const check = sinon.stub().resolves(["dup"]);
            const errors = await new Promise((resolve) => {
                CTDLASNCSVConceptImport.importProgressions(repo, progressionCsv(), () => resolve(null), resolve, null, null, new EcIdentityManager(), null, [check]);
            });
            assert.deepEqual(errors, ["dup"]);
            assert.deepEqual(check.firstCall.args[1], ["http://pm.test/L1", "http://pm.test/L2", "http://pm.test/L3", "http://pm.test/L4"]);
        });
    });

    describe('validateConceptHierarchy', () => {
        const rules = {
            "skos:Concept": { requiredProperties: ["skos:topConceptOf"], childProperties: ["skos:broader", "skos:narrower"], errorMessage: "custom" },
            "skos:ConceptScheme": { requiredProperties: ["skos:hasTopConcept"] }
        };

        it('requires rules', () => {
            assert.equal(CTDLASNCSVConceptImport.validateConceptHierarchy([], undefined), 'Hierarchy rules not defined.');
        });

        it('ignores types that are not present', () => {
            assert.isNull(CTDLASNCSVConceptImport.validateConceptHierarchy([null, { "@type": "x" }], rules));
        });

        it('passes on a required property of the type or a child property of any typed row', () => {
            assert.isNull(CTDLASNCSVConceptImport.validateConceptHierarchy([{ "@type": "skos:Concept", "skos:topConceptOf": "x" }], { "skos:Concept": rules["skos:Concept"] }));
            assert.isNull(CTDLASNCSVConceptImport.validateConceptHierarchy([{ "@type": "skos:Concept" }, { "@type": "o", "skos:narrower": "y" }], { "skos:Concept": rules["skos:Concept"] }));
        });

        it('ignores rows without a type and required properties on other types', () => {
            const data = [{ "@type": "skos:Concept" }, { "skos:broader": "y" }, null, { "@type": "o", "skos:topConceptOf": "x" }];
            assert.equal(CTDLASNCSVConceptImport.validateConceptHierarchy(data, { "skos:Concept": rules["skos:Concept"] }), "custom");
        });

        it('returns the default message for the first failing type', () => {
            const data = [{ "@type": "skos:Concept", "skos:broader": "y" }, { "@type": "skos:ConceptScheme" }];
            assert.equal(CTDLASNCSVConceptImport.validateConceptHierarchy(data, rules), "CSV must contain hierarchy properties for skos:ConceptScheme");
        });
    });

    (isNode ? describe : describe.skip)('JSON-LD document cache', () => {
        it('loads each remote context once and reuses it', async () => {
            // Serves stand-in contexts through jsonld's node document loader. The importer caches them
            // for the rest of the process, so no other test may rely on the real contexts.
            const { httpClient } = require('@digitalbazaar/http-client');
            const calls = [];
            sinon.stub(httpClient, 'get').callsFake(async (url) => {
                calls.push(url);
                return { status: 200, headers: { get: () => null }, data: { "@context": { "@vocab": "http://vocab.test/" } } };
            });
            sinon.stub(EcRemote, 'getExpectingObject').resolves({});
            const csv = csvOf([["@type", "@id", "ceasn:name"], ["skos:ConceptScheme", "http://cs.test/S1", "Scheme"], ["skos:Concept", "http://cs.test/K1", ""]]);
            let r = await importCsv(csv);
            assert.deepEqual(r.schemes.map(s => [s.id, s.type]), [["http://cs.test/S1", "ConceptScheme"]]);
            assert.deepEqual(r.concepts.map(c => c.id), ["http://cs.test/K1"]);
            assert.isAtMost(calls.length, 2);
            assert.isTrue(calls.every(u => u === "https://schema.cassproject.org/0.4/jsonld1.1/ceasn2cassConcepts.json" || u === "https://schema.cassproject.org/0.4/skos"));
            const before = calls.length;
            r = await importCsv(csv);
            assert.lengthOf(r.concepts, 1);
            assert.equal(calls.length, before);
        });
    });
});
