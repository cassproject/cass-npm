require('../../index.js');
const chai = require('chai');

const assert = chai.assert;

const SERVER = "http://repo.test/api/";

describe('TabStructuredImport.importCompetencies', () => {
    const run = async (text, serverUrl, repo, hashNameForId) => {
        let out = null;
        await TabStructuredImport.importCompetencies(text, serverUrl, null, (c, a) => { out = { c, a }; }, null, null, repo, hashNameForId);
        return out;
    };

    it('builds one competency per distinct line and a narrows alignment to the indented parent', async () => {
        const { c, a } = await run("Parent\n\tChild\n\tSibling\n\t\tGrandchild", SERVER, { selectedServer: SERVER }, true);
        assert.deepEqual(c.map(x => x.getName()), ["Parent", "\tChild", "\tSibling", "\t\tGrandchild"]);
        assert.equal(c[0].shortId(), SERVER + "data/schema.cassproject.org.0.4.Competency/" + EcCrypto.md5("Parent"));
        assert.lengthOf(a, 3);
        assert.deepEqual(a.map(x => [x.source, x.target, x.relationType]), [
            [c[1].shortId(), c[0].shortId(), EcAlignment.NARROWS],
            [c[2].shortId(), c[0].shortId(), EcAlignment.NARROWS],
            [c[3].shortId(), c[2].shortId(), EcAlignment.NARROWS]
        ]);
    });

    it('reuses the first competency with the same trimmed name', async () => {
        const { c, a } = await run("A\n\tB\nC\n\tB", SERVER, { selectedServer: SERVER }, true);
        assert.deepEqual(c.map(x => x.getName()), ["A", "\tB", "C"]);
        // The second "B" reuses the first one and gains a second parent.
        assert.deepEqual(a.map(x => [x.source, x.target]), [
            [c[1].shortId(), c[0].shortId()],
            [c[1].shortId(), c[2].shortId()]
        ]);
    });

    it('does not align a competency to itself when the parent has the same name', async () => {
        const { c, a } = await run("A\n\tA", SERVER, { selectedServer: SERVER }, true);
        assert.lengthOf(c, 1);
        assert.lengthOf(a, 0);
    });

    it('generates versioned ids when the server matches the repository', async () => {
        const { c, a } = await run("A\n\tB", SERVER, { selectedServer: SERVER }, false);
        assert.notEqual(c[0].id, c[0].shortId());
        assert.notEqual(a[0].id, a[0].shortId());
    });

    it('generates short ids when the server differs from the repository', async () => {
        const { c, a } = await run("A\n\tB", "http://other.test/", { selectedServer: SERVER }, false);
        assert.equal(c[0].id, c[0].shortId());
        assert.isTrue(c[0].id.startsWith("http://other.test/"));
        assert.equal(a[0].id, a[0].shortId());
    });

    it('counts leading tabs and spaces', () => {
        assert.equal(TabStructuredImport.tabs("\t  x"), 3);
        assert.equal(TabStructuredImport.tabs("   "), 3);
        assert.equal(TabStructuredImport.tabs("x\t"), 0);
    });
});
