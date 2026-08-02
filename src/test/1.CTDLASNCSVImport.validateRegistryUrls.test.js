let chai = require("chai");
const CTDLASNCSVImport = require("../org/cass/importer/CTDLASNCSVImport.js");

let expect = chai.expect;

// Unit tests for the registry URL validation added for cassproject/cass-editor#1423:
// CSV reference fields must contain either a CTID (ce-...) or a credential
// registry URL whose origin matches the configured environment.
describe("CTDLASNCSVImport.validateRegistryUrls", () => {
    const urlRules = {
        fields: {
            "ceasn:CompetencyFramework": ["ceasn:creator", "ceasn:publisher", "asn:hasProgressionModel", "ceasn:hasTopChild"],
            "ceasn:Competency": ["ceasn:creator", "ceterms:hasTask"]
        },
        allowedOrigins: ["https://sandbox.credentialengineregistry.org"]
    };
    const type = "ceasn:CompetencyFramework";

    it("accepts a CTID value", () => {
        const obj = { "ceasn:publisher": "ce-11111111-2222-3333-4444-555555555555" };
        expect(CTDLASNCSVImport.validateRegistryUrls(obj, type, 2, urlRules)).to.equal(null);
    });

    it("accepts a registry URL with an allowed origin", () => {
        const obj = { "ceasn:publisher": "https://sandbox.credentialengineregistry.org/resources/ce-1111" };
        expect(CTDLASNCSVImport.validateRegistryUrls(obj, type, 2, urlRules)).to.equal(null);
    });

    it("rejects a URL from a different origin", () => {
        const obj = { "ceasn:publisher": "https://credentialengineregistry.org/resources/ce-1111" };
        const errors = CTDLASNCSVImport.validateRegistryUrls(obj, type, 2, urlRules);
        expect(errors).to.be.an("array").with.lengthOf(1);
        expect(errors[0]).to.contain("Row 2");
        expect(errors[0]).to.contain("ceasn:publisher");
        expect(errors[0]).to.contain("https://credentialengineregistry.org/resources/ce-1111");
    });

    it("rejects an arbitrary non-registry URL", () => {
        const obj = { "ceasn:creator": "https://example.com/x" };
        const errors = CTDLASNCSVImport.validateRegistryUrls(obj, type, 3, urlRules);
        expect(errors).to.be.an("array").with.lengthOf(1);
        expect(errors[0]).to.contain("ceasn:creator");
    });

    it("rejects a value that is neither CTID nor URL", () => {
        const obj = { "ceasn:publisher": "Some Publisher Name" };
        const errors = CTDLASNCSVImport.validateRegistryUrls(obj, type, 4, urlRules);
        expect(errors).to.be.an("array").with.lengthOf(1);
        expect(errors[0]).to.contain("Some Publisher Name");
    });

    it("reports only the bad part of a pipe-delimited value", () => {
        const obj = { "ceasn:hasTopChild": "ce-11111111-2222-3333-4444-555555555555|https://evil.example.com/resources/ce-2222" };
        const errors = CTDLASNCSVImport.validateRegistryUrls(obj, type, 5, urlRules);
        expect(errors).to.be.an("array").with.lengthOf(1);
        expect(errors[0]).to.contain("https://evil.example.com/resources/ce-2222");
    });

    it("validates array values", () => {
        const obj = { "ceasn:creator": ["https://sandbox.credentialengineregistry.org/resources/ce-1", "https://example.org/nope"] };
        const errors = CTDLASNCSVImport.validateRegistryUrls(obj, type, 6, urlRules);
        expect(errors).to.be.an("array").with.lengthOf(1);
        expect(errors[0]).to.contain("https://example.org/nope");
    });

    it("collects errors across multiple fields", () => {
        const obj = {
            "ceasn:creator": "https://example.com/a",
            "ceasn:publisher": "https://example.com/b"
        };
        const errors = CTDLASNCSVImport.validateRegistryUrls(obj, type, 7, urlRules);
        expect(errors).to.be.an("array").with.lengthOf(2);
    });

    it("ignores fields not configured for the type", () => {
        const obj = { "ceasn:description": "https://example.com/not-checked" };
        expect(CTDLASNCSVImport.validateRegistryUrls(obj, type, 8, urlRules)).to.equal(null);
    });

    it("is inert for types with no configured fields", () => {
        const obj = { "ceasn:publisher": "https://example.com/x" };
        expect(CTDLASNCSVImport.validateRegistryUrls(obj, "skos:Concept", 9, urlRules)).to.equal(null);
    });

    it("is inert when urlRules is absent", () => {
        const obj = { "ceasn:publisher": "https://example.com/x" };
        expect(CTDLASNCSVImport.validateRegistryUrls(obj, type, 10, null)).to.equal(null);
    });

    it("is inert when allowedOrigins is empty", () => {
        const obj = { "ceasn:publisher": "https://example.com/x" };
        const rules = { fields: urlRules.fields, allowedOrigins: [] };
        expect(CTDLASNCSVImport.validateRegistryUrls(obj, type, 11, rules)).to.equal(null);
    });

    it("skips empty and null values", () => {
        const obj = { "ceasn:publisher": "", "ceasn:creator": null };
        expect(CTDLASNCSVImport.validateRegistryUrls(obj, type, 12, urlRules)).to.equal(null);
    });
});
