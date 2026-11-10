// Checks that, under Node, the crypto "worker" classes really run on web-worker
// threads. The other worker tests only check results, which would also pass if
// creating the workers failed and every call fell back to the main thread.
require('../../index.js');
const chai = require('chai');
const sinon = require('sinon');
const EcRsaOaepAsyncWorker = require('../com/eduworks/ec/crypto/EcRsaOaepAsyncWorker.js');
const EcAesCtrAsyncWorker = require('../com/eduworks/ec/crypto/EcAesCtrAsyncWorker.js');
const EcRsaOaepAsync = require('../com/eduworks/ec/crypto/EcRsaOaepAsync.js');
const EcAesCtrAsync = require('../com/eduworks/ec/crypto/EcAesCtrAsync.js');
const EcRsaOaep = require('../com/eduworks/ec/crypto/EcRsaOaep.js');
const EcAesCtr = require('../com/eduworks/ec/crypto/EcAesCtr.js');
const EcAes = require('../com/eduworks/ec/crypto/EcAes.js');
const EcPpk = require('../com/eduworks/ec/crypto/EcPpk.js');
const EcCrypto = require('../com/eduworks/ec/crypto/EcCrypto.js');

const assert = chai.assert;

describe('EcRsaOaepAsyncWorker threads (Node)', function () {
    this.timeout(60000);
    let ppk, pk, posted, caching;
    const fallbacks = [];

    before(async function () {
        if (typeof window !== 'undefined') this.skip();
        // Cached decryptions never reach a worker.
        caching = EcCrypto.caching;
        EcCrypto.caching = false;
        EcRsaOaepAsyncWorker.teardown();
        ppk = await EcPpk.generateKeyAsync();
        pk = ppk.toPk();
    });

    beforeEach(() => {
        // Any use of the main-thread implementations means the worker path was skipped.
        fallbacks.length = 0;
        for (const [cls, names] of [[EcRsaOaepAsync, ['encrypt', 'decrypt', 'sign', 'signSha256', 'verify', 'verifySha256']], [EcAesCtrAsync, ['encrypt', 'decrypt']]])
            for (const n of names) fallbacks.push(sinon.spy(cls, n));
        posted = [];
    });

    afterEach(() => sinon.restore());
    after(() => {
        EcRsaOaepAsyncWorker.teardown();
        if (caching !== undefined) EcCrypto.caching = caching;
    });

    function watchWorkers() {
        EcRsaOaepAsyncWorker.initWorker();
        for (const w of EcRsaOaepAsyncWorker.w)
            if (!w.postMessage.restore)
                sinon.stub(w, 'postMessage').callsFake(function (msg, origin) {
                    posted.push(msg.cmd);
                    return w.postMessage.wrappedMethod.call(w, msg, origin);
                });
    }

    function assertNoFallback() {
        for (const f of fallbacks)
            assert.isFalse(f.called, `fell back to ${f.toString()}`);
    }

    it('provides a Worker implementation', () => {
        assert.isFunction(global.Worker);
    });

    it('starts one worker per rotation without logging errors', () => {
        const report = sinon.spy(global.auditLogger, 'report');
        EcRsaOaepAsyncWorker.initWorker();
        assert.lengthOf(EcRsaOaepAsyncWorker.w, EcRsaOaepAsyncWorker.rotations);
        for (const w of EcRsaOaepAsyncWorker.w) {
            assert.isNotNull(w);
            assert.isFunction(w.postMessage);
            assert.isFunction(w._worker.terminate);
        }
        assert.isFalse(report.calledWith(sinon.match.any, sinon.match.any, 'EcRsaOaepAsyncWorker'), 'worker creation logged an error');
    });

    // ASCII interoperates with the main-thread classes. Non-ASCII text only round-trips
    // worker to worker: the worker path encodes UTF-8 differently.
    it('encrypts and decrypts on a worker', async () => {
        watchWorkers();
        const text = 'Hello, workers';
        assert.equal(EcRsaOaep.decrypt(ppk, await EcRsaOaepAsyncWorker.encrypt(pk, text)), text);
        assert.equal(await EcRsaOaepAsyncWorker.decrypt(ppk, EcRsaOaep.encrypt(pk, text)), text);
        const utf8 = 'Hello, workers ✓';
        assert.equal(await EcRsaOaepAsyncWorker.decrypt(ppk, await EcRsaOaepAsyncWorker.encrypt(pk, utf8)), utf8);
        assert.equal(await EcRsaOaepAsyncWorker.decrypt(ppk, EcRsaOaep.encrypt(pk, utf8)), utf8);
        assert.deepEqual(posted, ['encryptRsaOaep', 'decryptRsaOaep', 'encryptRsaOaep', 'decryptRsaOaep', 'decryptRsaOaep']);
        assertNoFallback();
    });

    it('signs and verifies on a worker', async () => {
        watchWorkers();
        const text = 'Sign me';
        const sha1 = await EcRsaOaepAsyncWorker.sign(ppk, text);
        const sha256 = await EcRsaOaepAsyncWorker.signSha256(ppk, text);
        assert.equal(sha256, EcRsaOaep.signSha256(ppk, text));
        assert.isTrue(await EcRsaOaepAsyncWorker.verify(pk, text, sha1));
        assert.isTrue(await EcRsaOaepAsyncWorker.verifySha256(pk, text, sha256));
        assert.isFalse(await EcRsaOaepAsyncWorker.verifySha256(pk, text + '!', sha256));
        const utf8 = 'Sign me ✓';
        assert.isTrue(await EcRsaOaepAsyncWorker.verifySha256(pk, utf8, await EcRsaOaepAsyncWorker.signSha256(ppk, utf8)));
        assert.deepEqual(posted, ['signRsaOaep', 'signSha256RsaOaep', 'verifyRsaOaep', 'verifyRsaOaepSha256', 'verifyRsaOaepSha256', 'signSha256RsaOaep', 'verifyRsaOaepSha256']);
        assertNoFallback();
    });

    it('runs AES-CTR on a worker', async () => {
        watchWorkers();
        const secret = EcAes.newSecret(32), iv = EcAes.newIv(16), text = 'AES on a worker';
        assert.equal(EcAesCtr.decrypt(await EcAesCtrAsyncWorker.encrypt(text, secret, iv), secret, iv), text);
        assert.equal(await EcAesCtrAsyncWorker.decrypt(EcAesCtr.encrypt(text, secret, iv), secret, iv), text);
        const utf8 = 'AES on a worker ✓';
        assert.equal(await EcAesCtrAsyncWorker.decrypt(await EcAesCtrAsyncWorker.encrypt(utf8, secret, iv), secret, iv), utf8);
        assert.deepEqual(posted, ['encryptAesCtr', 'decryptAesCtr', 'encryptAesCtr', 'decryptAesCtr']);
        assertNoFallback();
    });

    it('rotates work across all workers', async () => {
        watchWorkers();
        const used = new Set();
        EcRsaOaepAsyncWorker.w.forEach((w, i) => w.postMessage.callsFake(function (msg, origin) {
            used.add(i);
            return w.postMessage.wrappedMethod.call(w, msg, origin);
        }));
        const text = 'rotate';
        await Promise.all(Array.from({ length: EcRsaOaepAsyncWorker.rotations }, () => EcRsaOaepAsyncWorker.encrypt(pk, text)));
        assert.equal(used.size, EcRsaOaepAsyncWorker.rotations);
    });

    it('resolves the string "null" when the worker cannot decrypt', async () => {
        watchWorkers();
        assert.strictEqual(await EcRsaOaepAsyncWorker.decrypt(ppk, 'bm90IGNpcGhlcnRleHQ='), 'null');
        assert.deepEqual(posted, ['decryptRsaOaep']);
    });

    it('terminates the workers on teardown and starts new ones afterwards', async () => {
        EcRsaOaepAsyncWorker.initWorker();
        const old = EcRsaOaepAsyncWorker.w.map((w) => sinon.spy(w._worker, 'terminate'));
        EcRsaOaepAsyncWorker.teardown();
        assert.isNull(EcRsaOaepAsyncWorker.w);
        for (const t of old) assert.isTrue(t.calledOnce);
        watchWorkers();
        assert.equal(await EcRsaOaepAsyncWorker.decrypt(ppk, EcRsaOaep.encrypt(pk, 'again')), 'again');
        assertNoFallback();
    });
});
