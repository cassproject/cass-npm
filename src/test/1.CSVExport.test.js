require('../../index.js');
const chai = require('chai');

const assert = chai.assert;

const CTX = "https://schema.cassproject.org/0.4";

describe('CSVExport.CSVExportProcess', () => {
    const competency = (props) => Object.assign({ "@context": CTX, "@type": "Competency" }, props);

    it('skips falsy entries when building the export', () => {
        const p = new CSVExport.CSVExportProcess();
        p.buildExport([null, competency({ "@id": "http://x/1", name: "One" }), undefined, 0, "", false, competency({ "@id": "http://x/2", name: "Two" })], false);
        assert.lengthOf(p.csvOutput, 2);
        assert.equal(p.csvOutput[0].name, "One");
        assert.equal(p.csvOutput[1].name, "Two");
    });

    it('flattens nested objects with dotted names when not piped', () => {
        const p = new CSVExport.CSVExportProcess();
        p.buildExport([competency({ "@id": "http://x/1", name: { "@language": "en", "@value": "One" } })], false);
        assert.equal(p.csvOutput[0]["name.@language"], "en");
        assert.equal(p.csvOutput[0]["name.@value"], "One");
    });

    it('joins piped arrays and objects with |', () => {
        const p = new CSVExport.CSVExportProcess();
        p.buildExport([competency({
            "@id": "http://x/1",
            "ceasn:keyword": ["a", "b"],
            "ceasn:nested": { first: "x", second: ["y", "z"] }
        })], true);
        assert.equal(p.csvOutput[0]["ceasn:keyword"], "a|b");
        assert.equal(p.csvOutput[0]["ceasn:nested"], "x|y|z");
    });

    it('formats piped ceterms:versionIdentifier entries as code~type~uri', () => {
        const p = new CSVExport.CSVExportProcess();
        p.buildExport([competency({
            "@id": "http://x/1",
            "ceterms:versionIdentifier": [
                { "ceterms:identifierValueCode": "1.0", "ceterms:identifierTypeName": { "en-us": "Version" }, "ceterms:identifierType": "http://t/1" },
                { "ceterms:identifierValueCode": "2.0" },
                { "ceterms:identifierTypeName": { "en-us": "Only" } }
            ]
        })], true);
        // Entries without an identifierType get no "|" separator; the final character is always dropped.
        assert.equal(p.csvOutput[0]["ceterms:versionIdentifier"], "1.0~Version~http://t/1|2.0~Only");
    });

    it('fills missing columns with empty strings on earlier rows', () => {
        const p = new CSVExport.CSVExportProcess();
        p.buildExport([competency({ "@id": "http://x/1", name: "One" }), competency({ "@id": "http://x/2", name: "Two", description: "D" })], false);
        assert.strictEqual(p.csvOutput[0].description, "");
        assert.equal(p.csvOutput[1].description, "D");
    });
});
