require('../../index.js');
const chai = require('chai');
const sinon = require('sinon');
const EcRemote = require('../com/eduworks/ec/remote/EcRemote.js');

const assert = chai.assert;
const isNode = typeof process !== 'undefined' && process.versions?.node != null && typeof window === 'undefined';

const routes = {
    'GET /json': [200, 'application/json; charset=utf-8', '{"a":1}'],
    'GET /text-json': [200, 'text/plain', '{"b":2}'],
    'GET /text': [200, 'text/plain', 'hello'],
    'GET /err-json': [500, 'application/json', '{"x":1}'],
    'GET /err-text': [500, 'text/plain', 'nope'],
    'GET /err-empty': [500, 'text/plain', ''],
    'POST /post-json': [200, 'application/json', '{"posted":true}'],
    'POST /post-text': [200, 'text/plain', 'plain'],
    'POST /post-err': [400, 'text/plain', ''],
    'DELETE /del-json': [200, 'application/json', '{"deleted":1}'],
    'DELETE /del-text-json': [200, 'text/plain', '[1,2]'],
    'DELETE /del-text': [200, 'text/plain', 'gone'],
    'DELETE /del-err': [500, 'application/json', '{"z":1}'],
};

// DNS lookups for the log lines finish after the request, so find the call for this URL.
async function callFor(report, url) {
    let found = null;
    await waitFor(() => (found = report.getCalls().find((c) => c.args.includes(url))) != null);
    return found.args;
}

async function waitFor(fn) {
    for (let i = 0; i < 200; i++) {
        if (fn()) return;
        await new Promise((r) => setTimeout(r, 10));
    }
    throw new Error("timed out waiting");
}

(isNode ? describe : describe.skip)('EcRemote responses', () => {
    let server, base, closedBase;
    before(async () => {
        const http = require('http');
        server = http.createServer((req, res) => {
            const r = routes[req.method + ' ' + req.url];
            req.resume();
            if (r == null) { res.writeHead(404); res.end(); return; }
            res.writeHead(r[0], { 'content-type': r[1] });
            res.end(r[2]);
        });
        await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
        base = 'http://127.0.0.1:' + server.address().port + '/';
        const probe = http.createServer();
        await new Promise((resolve) => probe.listen(0, '127.0.0.1', resolve));
        closedBase = 'http://127.0.0.1:' + probe.address().port + '/';
        await new Promise((resolve) => probe.close(resolve));
    });
    after(() => server.close());
    afterEach(() => sinon.restore());

    it('GET parses JSON and JSON-looking text, and returns other text as is', async () => {
        assert.deepEqual(await EcRemote.getExpectingObject(base, 'json'), { a: 1 });
        assert.deepEqual(await EcRemote.getExpectingString(base, 'text-json'), { b: 2 });
        assert.strictEqual(await EcRemote.getExpectingString(base, 'text'), 'hello');
    });
    it('GET logs the resolved address on success', async () => {
        const report = sinon.stub(global.auditLogger, 'report');
        await EcRemote.getExpectingString(base, 'text');
        const args = await callFor(report, base + 'text');
        assert.equal(args[1], global.auditLogger.Severity.INFO);
        assert.equal(args[2], 'EcRemoteGetExpectString');
        assert.equal(args[3], '127.0.0.1');
        assert.equal(args[4], base + 'text');
    });
    it('GET errors use the body, or the status text when there is none', async () => {
        const report = sinon.stub(global.auditLogger, 'report');
        let e = await EcRemote.getExpectingString(base, 'err-json').catch((x) => x);
        assert.instanceOf(e, Error);
        assert.equal(e.message, '[object Object]');
        e = await EcRemote.getExpectingString(base, 'err-text').catch((x) => x);
        assert.equal(e.message, 'nope');
        e = await EcRemote.getExpectingString(base, 'err-empty').catch((x) => x);
        assert.equal(e.message, 'Internal Server Error');
        await callFor(report, base + 'err-empty');
    });
    it('GET failures are logged with the resolved address and rethrown', async () => {
        const report = sinon.stub(global.auditLogger, 'report');
        let failed = null;
        const r = await EcRemote.getExpectingString(closedBase, 'x', null, (e) => { failed = e; return 'handled'; });
        assert.equal(r, 'handled');
        assert.instanceOf(failed, Error);
        const args = await callFor(report, closedBase + 'x');
        assert.equal(args[1], global.auditLogger.Severity.INFO);
        assert.deepEqual(args.slice(2), ['EcRemoteGetExpectString', '127.0.0.1', closedBase + 'x', failed]);
    });
    it('POST parses JSON and returns text', async () => {
        const report = sinon.stub(global.auditLogger, 'report');
        const fd = new EcRemote.FormData();
        fd.append('a', 'b');
        assert.deepEqual(await EcRemote.postExpectingObject(base, 'post-json', fd), { posted: true });
        assert.strictEqual(await EcRemote.postExpectingString(base, 'post-text', fd), 'plain');
        const e = await EcRemote.postExpectingString(base, 'post-err', fd).catch((x) => x);
        assert.equal(e.message, 'Bad Request');
        await callFor(report, base + 'post-err');
    });
    it('POST failures are logged with the resolved address and rethrown', async () => {
        const report = sinon.stub(global.auditLogger, 'report');
        const e = await EcRemote.postExpectingString(closedBase, 'x', new EcRemote.FormData()).catch((x) => x);
        assert.instanceOf(e, Error);
        const args = await callFor(report, closedBase + 'x');
        assert.equal(args[1], global.auditLogger.Severity.ERROR);
        assert.deepEqual(args.slice(2), ['EcRemotePostInner', '127.0.0.1', closedBase + 'x', null, e]);
    });
    it('DELETE parses JSON and JSON-looking text, and returns other text as is', async () => {
        assert.deepEqual(await EcRemote._delete(base + 'del-json', 'sheet'), { deleted: 1 });
        assert.deepEqual(await EcRemote._delete(base + 'del-text-json', 'sheet'), [1, 2]);
        assert.strictEqual(await EcRemote._delete(base + 'del-text', 'sheet'), 'gone');
    });
    it('DELETE errors use the status text and are logged with the resolved address', async () => {
        const report = sinon.stub(global.auditLogger, 'report');
        let e = await EcRemote._delete(base + 'del-err', 'sheet').catch((x) => x);
        assert.equal(e.message, 'Internal Server Error');
        assert.deepEqual((await callFor(report, base + 'del-err')).slice(2), ['EcRemoteDelete', '127.0.0.1', base + 'del-err', 'sheet', e]);
        e = await EcRemote._delete(closedBase + 'x', 'sheet').catch((x) => x);
        assert.instanceOf(e, Error);
        const args = await callFor(report, closedBase + 'x');
        assert.equal(args[1], global.auditLogger.Severity.INFO);
        assert.deepEqual(args.slice(2), ['EcRemoteDelete', '127.0.0.1', closedBase + 'x', 'sheet', e]);
    });
});

(isNode ? describe : describe.skip)('EcRemote.upgradeHttpToHttps', () => {
    function withWindow(protocol, fn) {
        global.window = { location: { protocol } };
        try {
            return fn();
        } finally {
            delete global.window;
        }
    }
    it('leaves URLs alone without a window', () => {
        assert.equal(EcRemote.upgradeHttpToHttps('http://a/b'), 'http://a/b');
    });
    it('upgrades http URLs on an https page', () => {
        assert.equal(withWindow('https:', () => EcRemote.upgradeHttpToHttps('http://a/http:')), 'https://a/http:');
        assert.equal(withWindow('https:', () => EcRemote.upgradeHttpToHttps('https://a/b')), 'https://a/b');
        assert.equal(withWindow('https:', () => EcRemote.upgradeHttpToHttps('//a/b')), '//a/b');
    });
    it('leaves URLs that mention the page protocol alone', () => {
        assert.equal(withWindow('https:', () => EcRemote.upgradeHttpToHttps('http://a/?u=https:')), 'http://a/?u=https:');
    });
    it('leaves URLs alone on an http page', () => {
        assert.equal(withWindow('http:', () => EcRemote.upgradeHttpToHttps('http://a/b')), 'http://a/b');
    });
});
