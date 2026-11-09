require('../../index.js');
const chai = require('chai');
const sinon = require('sinon');
const forge = require('node-forge');
const EcPpk = require('../com/eduworks/ec/crypto/EcPpk.js');
const EcPk = require('../com/eduworks/ec/crypto/EcPk.js');
const EcRsaOaepAsync = require('../com/eduworks/ec/crypto/EcRsaOaepAsync.js');
const EcRsaOaepAsyncWorker = require('../com/eduworks/ec/crypto/EcRsaOaepAsyncWorker.js');
const EcAesCtrAsync = require('../com/eduworks/ec/crypto/EcAesCtrAsync.js');
const EcCrypto = require('../com/eduworks/ec/crypto/EcCrypto.js');

const assert = chai.assert;
const isNode = typeof process !== 'undefined' && process.versions?.node != null && typeof window === 'undefined';

const PEM = "-----BEGIN RSA PRIVATE KEY-----MIIEpAIBAAKCAQEAz4BiFucFE9bNcKfGD+e6aPRHl402YM4Z6nrurDRNlnwsWpsCoZasPLkjC314pVtHAI2duZo+esGKDloBsiLxASRJo3R2XiXVh2Y8U1RcHA5mWL4tMG5UY2d0libpNEHbHPNBmooVYpA2yhxN/vGibIk8x69uZWxJcFOxOg6zWG8EjF8UMgGnRCVSMTY3THhTlfZ0cGUzvrfb7OvHUgdCe285XkmYkj/V9P/m7hbWoOyJAJSTOm4/s6fIKpl72lblfN7bKaxTCsJp6/rQdmUeo+PIaa2lDOfo7dWbuTMcqkZ93kispNfYYhsEGUGlCsrrVWhlve8MenO4GdLsFP+HRwIDAQABAoIBAGaQpOuBIYde44lNxJ7UAdYi+Mg2aqyK81Btl0/TQo6hriLTAAfzPAt/z4y8ZkgFyCDD3zSAw2VWCPFzF+d/UfUohKWgyWlb9iHJLQRbbHQJwhkXV6raviesWXpmnVrROocizkie/FcNxac9OmhL8+cGJt7lHgJP9jTpiW6TGZ8ZzM8KBH2l80x9AWdvCjsICuPIZRjc706HtkKZzTROtq6Z/F4Gm0uWRnwAZrHTRpnh8qjtdBLYFrdDcUoFtzOM6UVRmocTfsNe4ntPpvwY2aGTWY7EmTj1kteMJ+fCQFIS+KjyMWQHsN8yQNfD5/j2uv6/BdSkO8uorGSJT6DwmTECgYEA8ydoQ4i58+A1udqA+fujM0Zn46++NTehFe75nqIt8rfQgoduBam3lE5IWj2U2tLQeWxQyr1ZJkLbITtrAI3PgfMnuFAii+cncwFo805Fss/nbKx8K49vBuCEAq3MRhLjWy3ZvIgUHj67jWvl50dbNqc7TUguxhS4BxGr/cPPkP0CgYEA2nbJPGzSKhHTETL37NWIUAdU9q/6NVRISRRXeRqZYwE1VPzs2sIUxA8zEDBHX7OtvCKzvZy1Lg5Unx1nh4nCEVkbW/8npLlRG2jOcZJF6NRfhzwLz3WMIrP6j9SmjJaB+1mnrTjfsg36tDEPDjjJLjJHCx9z/qRJh1v4bh4aPpMCgYACG31T2IOEEZVlnvcvM3ceoqWT25oSbAEBZ6jSLyWmzOEJwJK7idUFfAg0gAQiQWF9K+snVqzHIB02FIXA43nA7pKRjmA+RiqZXJHEShFgk1y2HGiXGA8mSBvcyhTTJqbBy4vvjl5eRLzrZNwBPSUVPC3PZajCHrvZk9WhxWivIQKBgQCzCu1MH2dy4R7ZlqsIJ8zKweeJMZpfQI7pjclO0FTrhh7+Yzd+5db9A/P2jYrBTVHSwaILgTYf49DIguHJfEZXz26TzB7iapqlWxTukVHISt1ryPNo+E58VoLAhChnSiaHJ+g7GESE+d4A9cAACNwgh0YgQIvhIyW70M1e+j7KDwKBgQDQSBLFDFmvvTP3sIRAr1+0OZWd1eRcwdhs0U9GwootoCoUP/1Y64pqukT6B9oIB/No9Nyn8kUX3/ZDtCslaGKEUGMJXQ4hc5J+lq0tSi9ZWBdhqOuMPEfUF3IxW+9yeILP4ppUBn1m5MVOWg5CvuuEeCmy4bhMaUErUlHZ78t5cA==-----END RSA PRIVATE KEY-----";
const PK_PEM = "-----BEGIN PUBLIC KEY-----MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAz4BiFucFE9bNcKfGD+e6aPRHl402YM4Z6nrurDRNlnwsWpsCoZasPLkjC314pVtHAI2duZo+esGKDloBsiLxASRJo3R2XiXVh2Y8U1RcHA5mWL4tMG5UY2d0libpNEHbHPNBmooVYpA2yhxN/vGibIk8x69uZWxJcFOxOg6zWG8EjF8UMgGnRCVSMTY3THhTlfZ0cGUzvrfb7OvHUgdCe285XkmYkj/V9P/m7hbWoOyJAJSTOm4/s6fIKpl72lblfN7bKaxTCsJp6/rQdmUeo+PIaa2lDOfo7dWbuTMcqkZ93kispNfYYhsEGUGlCsrrVWhlve8MenO4GdLsFP+HRwIDAQAB-----END PUBLIC KEY-----";
const PK_PKCS1_PEM = "-----BEGIN RSA PUBLIC KEY-----MIIBCgKCAQEAz4BiFucFE9bNcKfGD+e6aPRHl402YM4Z6nrurDRNlnwsWpsCoZasPLkjC314pVtHAI2duZo+esGKDloBsiLxASRJo3R2XiXVh2Y8U1RcHA5mWL4tMG5UY2d0libpNEHbHPNBmooVYpA2yhxN/vGibIk8x69uZWxJcFOxOg6zWG8EjF8UMgGnRCVSMTY3THhTlfZ0cGUzvrfb7OvHUgdCe285XkmYkj/V9P/m7hbWoOyJAJSTOm4/s6fIKpl72lblfN7bKaxTCsJp6/rQdmUeo+PIaa2lDOfo7dWbuTMcqkZ93kispNfYYhsEGUGlCsrrVWhlve8MenO4GdLsFP+HRwIDAQAB-----END RSA PUBLIC KEY-----";
const TEXT = "hello ᚠ world";
const SIG_SHA1 = "d5IBsi6/wwUEfF+3IuYMoac7yOaSm/r8+1YfRqKKk9rxgep9cjO1Y0Pyk1rbOzQIpQ4fO8SIqigdag9pbx5kxClPm452SfQplpzj05kPnFv58YB9ZWA/wb7nSFV7cLqHGfiRqAr/+hvedbVToLBUsc8UVLauq36WZW0M7cbqR74ZUxRPNftc7b/gGlIsiHNb0KA2H+HF4XcoDVRKaGIrJk0w3ThW9swSD9gU04131WRFw/KVGhfUnmUAuuVYt6JiKx2Rj5MZvzKtedksP6ytJPqiDKahBRZBiwCnNplEQXJKxSRucMUzmwyVPSHxQhihl0MQZZU4otVcE8EJFASEEw==";
const SIG_SHA256 = "xZZkzhAqea1SuQFWR9KoDGo2sMY17wb40azbWbnF1iEnf3RNb3wQgKnsMWfNCuaEuc6wLC8dvhFFFrgOPB70/xDgnNjBsXREFCQ+sZyeJvMA4sg4m5reu9bm6XpPaVzL/S7liHlseb6U15Tr+TbucajZieMdwNNhQjUR0R5+WxJBkhUoAtMao2HNnMbAQ3A7ILJHWp1HkaJpabp7zTlHERMB/6ymqMQFGpzSZnZpdl5NxDi/qWf7v6G+TsTGv26NTb0/jfGkCUcy7jvjR79qXP1G0zVB4K7cnxrEHiilkfmPMPC7bxdW6s1eA/gwrV4+4qPqtLJW5de60gpOCJJ3gQ==";
const AES_SECRET = "AAECAwQFBgcICQoLDA0ODw==";
const AES_IV = "EBESExQVFhcYGRobHB0eHw==";

const sha256 = (s) => forge.md.sha256.create().update(typeof s === 'string' ? s : JSON.stringify(s), 'utf8').digest().toHex();

describe('EcPk and EcPpk encodings', () => {
    it('EcPpk PEM and JWK encodings are unchanged', () => {
        const ppk = EcPpk.fromPem(PEM);
        delete ppk.defaultPem;
        delete ppk.jwk;
        assert.equal(sha256(ppk.toPem()), 'f08b141ee4e918684781eca1aa13cf16a3631674d56d8f65b70e9ba8bbbd8b3a');
        assert.equal(ppk.toPem(), PEM);
        assert.equal(sha256(ppk.toPkcs1Pem()), 'f08b141ee4e918684781eca1aa13cf16a3631674d56d8f65b70e9ba8bbbd8b3a');
        assert.equal(sha256(ppk.toPkcs8Pem()), 'aedcee9d0922723128ede50a0390df163b04fc71e87884d7609ac10d5f2f1b3d');
        assert.notMatch(ppk.toPkcs8Pem(), /[\r\n]/);
        assert.match(ppk.toPkcs8Pem(), /^-----BEGIN PRIVATE KEY-----[A-Za-z0-9+/=]+-----END PRIVATE KEY-----$/);
        assert.equal(sha256(ppk.toJwk()), '4b912898e05a4c2001d5cca115590491efd85b8a19de8f18be486d46642fec69');
        for (const v of Object.values(ppk.toJwk()))
            assert.notMatch(v, /[+/=]/);
    });
    it('EcPk PEM and JWK encodings are unchanged', () => {
        const pk = EcPpk.fromPem(PEM).toPk();
        delete pk.defaultPem;
        delete pk.jwk;
        assert.equal(pk.toPem(), PK_PEM);
        assert.equal(sha256(pk.toPem()), '9b54f7aa5d9949eb22252c69f0894dfe280d2cf999f60b30a4d9fa90f45c23d4');
        assert.equal(pk.toPkcs1Pem(), PK_PKCS1_PEM);
        assert.equal(sha256(pk.toPkcs1Pem()), '0076d5976edd7de19feb6c0e1d49a8845a66afb35916aeeb5d765601e145f15f');
        assert.equal(pk.toPkcs8Pem(), PK_PEM);
        assert.equal(sha256(pk.toJwk()), 'd8899e312b58f4b3284a4bde1a8c31af0d025fb04e6401dbf55cd34f4ff71b51');
        assert.deepEqual(Object.keys(pk.toJwk()), ['kty', 'n', 'e']);
        assert.equal(pk.toJwk().e, 'AQAB');
    });
});

describe('EcRsaOaepAsync signatures', () => {
    it('sign (sha1) gives the same signature with and without a cached key', async () => {
        const ppk = EcPpk.fromPem(PEM);
        delete ppk.signKey;
        assert.equal(await EcRsaOaepAsync.sign(ppk, TEXT), SIG_SHA1);
        assert.equal(await EcRsaOaepAsync.sign(ppk, TEXT), SIG_SHA1);
    });
    it('sign (sha1) passes the signature to the success callback', async () => {
        const ppk = EcPpk.fromPem(PEM);
        delete ppk.signKey;
        let seen = null;
        const r = await EcRsaOaepAsync.sign(ppk, TEXT, (s) => { seen = s; return 'cb'; }, null);
        assert.equal(seen, SIG_SHA1);
        assert.equal(r, 'cb');
    });
    it('signSha256 gives the same signature with and without a cached key', async () => {
        const ppk = EcPpk.fromPem(PEM);
        delete ppk.signKey256;
        assert.equal(await EcRsaOaepAsync.signSha256(ppk, TEXT), SIG_SHA256);
        assert.equal(await EcRsaOaepAsync.signSha256(ppk, TEXT), SIG_SHA256);
    });
    it('verify (sha1) with and without a cached key', async () => {
        const pk = EcPk.fromPem(PK_PEM);
        delete pk.signKey;
        assert.strictEqual(await EcRsaOaepAsync.verify(pk, TEXT, SIG_SHA1), true);
        assert.isDefined(pk.signKey);
        assert.strictEqual(await EcRsaOaepAsync.verify(pk, TEXT, SIG_SHA1), true);
        assert.strictEqual(await EcRsaOaepAsync.verify(pk, TEXT + "x", SIG_SHA1), false);
        delete pk.signKey;
        assert.strictEqual(await EcRsaOaepAsync.verify(pk, TEXT + "x", SIG_SHA1), false);
    });
    it('verifySha256 with and without a cached key', async () => {
        const pk = EcPk.fromPem(PK_PEM);
        delete pk.signKey256;
        assert.strictEqual(await EcRsaOaepAsync.verifySha256(pk, TEXT, SIG_SHA256), true);
        assert.isDefined(pk.signKey256);
        assert.strictEqual(await EcRsaOaepAsync.verifySha256(pk, TEXT, SIG_SHA256), true);
        assert.strictEqual(await EcRsaOaepAsync.verifySha256(pk, TEXT, SIG_SHA1), false);
        delete pk.signKey256;
        assert.strictEqual(await EcRsaOaepAsync.verifySha256(pk, TEXT, SIG_SHA1), false);
    });
    it('verify rejects when the key cannot be imported', async () => {
        const pk = EcPk.fromPem(PK_PEM);
        const saved = pk.signKey;
        delete pk.signKey;
        const jwk = sinon.stub(pk, 'toJwk').returns({ kty: 'RSA' });
        try {
            let failed = false;
            await EcRsaOaepAsync.verify(pk, TEXT, SIG_SHA1).catch(() => { failed = true; });
            assert.isTrue(failed);
        } finally {
            jwk.restore();
            pk.signKey = saved;
        }
    });
});

describe('EcAesCtrAsync', () => {
    let caching;
    beforeEach(() => { caching = EcCrypto.caching; });
    afterEach(() => { EcCrypto.caching = caching; });

    it('encrypts to the pinned ciphertext', async () => {
        assert.equal(await EcAesCtrAsync.encrypt("plain ascii text", AES_SECRET, AES_IV), "d5KOHY/1Yh3zZ4cx+vHq5w==");
        assert.equal(await EcAesCtrAsync.encrypt(TEXT, AES_SECRET, AES_IV), "b5uDGI714vQwLpl+/Pj2");
    });
    it('encrypt passes the ciphertext to the success callback', async () => {
        let seen = null;
        await EcAesCtrAsync.encrypt(TEXT, AES_SECRET, AES_IV, (c) => { seen = c; }, null);
        assert.equal(seen, "b5uDGI714vQwLpl+/Pj2");
    });
    it('decrypts without caching', async () => {
        EcCrypto.caching = false;
        delete EcCrypto.decryptionCache[AES_SECRET + AES_IV + "b5uDGI714vQwLpl+/Pj2"];
        assert.equal(await EcAesCtrAsync.decrypt("b5uDGI714vQwLpl+/Pj2", AES_SECRET, AES_IV), TEXT);
        assert.isUndefined(EcCrypto.decryptionCache[AES_SECRET + AES_IV + "b5uDGI714vQwLpl+/Pj2"]);
    });
    it('decrypts with caching and fills the cache', async () => {
        EcCrypto.caching = true;
        const key = AES_SECRET + AES_IV + "b5uDGI714vQwLpl+/Pj2";
        delete EcCrypto.decryptionCache[key];
        assert.equal(await EcAesCtrAsync.decrypt("b5uDGI714vQwLpl+/Pj2", AES_SECRET, AES_IV), TEXT);
        assert.equal(EcCrypto.decryptionCache[key], TEXT);
        delete EcCrypto.decryptionCache[key];
    });
    it('decrypt rejects on a bad key', async () => {
        EcCrypto.caching = false;
        let failed = null;
        await EcAesCtrAsync.decrypt("b5uDGI714vQwLpl+/Pj2", "AAEC", AES_IV, null, (e) => { failed = e; });
        assert.isNotNull(failed);
    });
});

(isNode ? describe : describe.skip)('EcAesCtrAsync FIPS toggling errors', () => {
    const realCrypto = isNode ? require('crypto') : null;
    const modulePath = isNode ? require.resolve('../com/eduworks/ec/crypto/EcAesCtrAsync.js') : null;
    let fips;
    function freshModule() {
        // The module keeps fipsForced / inWorker flags; load a private copy so they don't leak.
        const saved = require.cache[modulePath];
        delete require.cache[modulePath];
        try {
            return require(modulePath);
        } finally {
            require.cache[modulePath] = saved;
        }
    }
    beforeEach(() => {
        fips = process.env.FIPS;
        process.env.FIPS = "1";
    });
    afterEach(() => {
        if (fips === undefined) delete process.env.FIPS;
        else process.env.FIPS = fips;
        sinon.restore();
    });

    for (const [method, current] of [['fipsOn', 0], ['fipsOff', 1]]) {
        it(method + ': ERR_CRYPTO_FIPS_FORCED stops further toggling', () => {
            const M = freshModule();
            sinon.stub(realCrypto, 'getFips').returns(current);
            const set = sinon.stub(realCrypto, 'setFips').throws(new Error("boom ERR_CRYPTO_FIPS_FORCED"));
            const report = sinon.stub(global.auditLogger, 'report');
            M[method]();
            assert.equal(set.callCount, 1);
            assert.deepEqual(set.firstCall.args, [current == 0]);
            M.fipsOn();
            M.fipsOff();
            assert.equal(set.callCount, 1);
            assert.equal(realCrypto.getFips.callCount, 1);
            assert.equal(report.callCount, 0);
        });
        it(method + ': ERR_WORKER_UNSUPPORTED_OPERATION stops further toggling', () => {
            const M = freshModule();
            sinon.stub(realCrypto, 'getFips').returns(current);
            const set = sinon.stub(realCrypto, 'setFips').throws(new Error("ERR_WORKER_UNSUPPORTED_OPERATION here"));
            const report = sinon.stub(global.auditLogger, 'report');
            M[method]();
            M[method]();
            M.fipsOn();
            assert.equal(set.callCount, 1);
            assert.equal(report.callCount, 0);
        });
        it(method + ': other errors are reported and toggling continues', () => {
            const M = freshModule();
            sinon.stub(realCrypto, 'getFips').returns(current);
            const err = new Error("something else");
            const set = sinon.stub(realCrypto, 'setFips').throws(err);
            const report = sinon.stub(global.auditLogger, 'report');
            M[method]();
            M[method]();
            assert.equal(set.callCount, 2);
            assert.equal(report.callCount, 2);
            assert.deepEqual(report.firstCall.args.slice(2), ["EcAesCtrAsyncFips", "ERR_CRYPTO_FIPS", err]);
        });
        it(method + ': does nothing when FIPS is already in the wanted state', () => {
            const M = freshModule();
            sinon.stub(realCrypto, 'getFips').returns(1 - current);
            const set = sinon.stub(realCrypto, 'setFips');
            M[method]();
            assert.equal(set.callCount, 0);
        });
    }
    it('does nothing when FIPS is not requested', () => {
        delete process.env.FIPS;
        const M = freshModule();
        const get = sinon.stub(realCrypto, 'getFips').returns(0);
        const set = sinon.stub(realCrypto, 'setFips');
        M.fipsOn();
        M.fipsOff();
        assert.equal(get.callCount, 0);
        assert.equal(set.callCount, 0);
    });
});

(isNode ? describe : describe.skip)('EcRsaOaepAsyncWorker.createWorker', () => {
    const path = isNode ? require('path') : null;
    const url = isNode ? require('url') : null;
    let savedWorker, savedW;
    beforeEach(() => {
        savedWorker = global.Worker;
        savedW = EcRsaOaepAsyncWorker.w;
    });
    afterEach(() => {
        global.Worker = savedWorker;
        EcRsaOaepAsyncWorker.w = savedW;
        sinon.restore();
    });

    it('falls back through the worker scripts and replaces a worker that errors', () => {
        const created = [];
        global.Worker = class FakeWorker {
            constructor(arg) {
                created.push(arg);
                if (created.length <= 2) throw new Error("no worker " + created.length);
                this.arg = arg;
            }
            addEventListener() { }
        };
        const report = sinon.stub(global.auditLogger, 'report');
        EcRsaOaepAsyncWorker.w = [];
        EcRsaOaepAsyncWorker.createWorker(3);
        const dir = path.dirname(require.resolve('../com/eduworks/ec/crypto/EcRsaOaepAsyncWorker.js'));
        assert.equal(created.length, 3);
        assert.equal(created[0].href, url.pathToFileURL(path.resolve(dir, 'forgeAsyncNode.js')).href);
        assert.equal(created[1].href, url.pathToFileURL(path.resolve(dir, 'forgeAsync.js')).href);
        assert.equal(created[2], path.resolve(dir, 'forgeAsync.js'));
        assert.equal(report.callCount, 2);
        const first = EcRsaOaepAsyncWorker.w[3];
        assert.equal(first._worker.arg, created[2]);

        first._worker.onerror({ type: 'error' });
        assert.equal(created.length, 4);
        assert.equal(created[3], path.resolve(dir, 'cass-editor/forgeAsync.js'));
        assert.notStrictEqual(EcRsaOaepAsyncWorker.w[3], first);
        assert.equal(EcRsaOaepAsyncWorker.w[3]._worker.arg, created[3]);
        assert.equal(report.callCount, 3);
    });
});

(isNode ? describe : describe.skip)('forgeAsyncNode worker messages', () => {
    after(() => EcRsaOaepAsyncWorker.teardown());
    it('answers unknown commands and reports command errors', async () => {
        EcRsaOaepAsyncWorker.initWorker();
        const w = EcRsaOaepAsyncWorker.w[0];
        assert.equal(await w.postMessage({ cmd: 'nope', origin: 'cassproject' }), 'Unknown command: undefined');
        const r = await w.postMessage({ cmd: 'signRsaOaep', ppk: 'not a pem', text: 'x', origin: 'cassproject' });
        assert.property(r, 'error');
        assert.equal(await w.postMessage({ cmd: 'signRsaOaep', ppk: PEM, text: TEXT, origin: 'cassproject' }), SIG_SHA1);
    });
    it('passes a rejected promise back as an error', async () => {
        EcRsaOaepAsyncWorker.initWorker();
        const w = EcRsaOaepAsyncWorker.w[1];
        let failed = null;
        await w.postMessage({ cmd: 'decryptAesCtr', text: 'b5uDGI714vQwLpl+/Pj2', secret: 'AAEC', iv: AES_IV, origin: 'cassproject' }).catch((e) => { failed = e; });
        assert.instanceOf(failed, Error);
    });
});
