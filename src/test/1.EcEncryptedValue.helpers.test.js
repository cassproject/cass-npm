require('../../index.js');
const chai = require('chai');
const sinon = require('sinon');
const EcEncryptedValue = require('../org/cassproject/ebac/repository/EcEncryptedValue.js');
const EcRsaOaepAsyncWorker = require('../com/eduworks/ec/crypto/EcRsaOaepAsyncWorker.js');
const EcAesCtrAsyncWorker = require('../com/eduworks/ec/crypto/EcAesCtrAsyncWorker.js');
const EcPpk = require('../com/eduworks/ec/crypto/EcPpk.js');
const EcPk = require('../com/eduworks/ec/crypto/EcPk.js');

const assert = chai.assert;

const PEM = "-----BEGIN RSA PRIVATE KEY-----MIIEpAIBAAKCAQEAz4BiFucFE9bNcKfGD+e6aPRHl402YM4Z6nrurDRNlnwsWpsCoZasPLkjC314pVtHAI2duZo+esGKDloBsiLxASRJo3R2XiXVh2Y8U1RcHA5mWL4tMG5UY2d0libpNEHbHPNBmooVYpA2yhxN/vGibIk8x69uZWxJcFOxOg6zWG8EjF8UMgGnRCVSMTY3THhTlfZ0cGUzvrfb7OvHUgdCe285XkmYkj/V9P/m7hbWoOyJAJSTOm4/s6fIKpl72lblfN7bKaxTCsJp6/rQdmUeo+PIaa2lDOfo7dWbuTMcqkZ93kispNfYYhsEGUGlCsrrVWhlve8MenO4GdLsFP+HRwIDAQABAoIBAGaQpOuBIYde44lNxJ7UAdYi+Mg2aqyK81Btl0/TQo6hriLTAAfzPAt/z4y8ZkgFyCDD3zSAw2VWCPFzF+d/UfUohKWgyWlb9iHJLQRbbHQJwhkXV6raviesWXpmnVrROocizkie/FcNxac9OmhL8+cGJt7lHgJP9jTpiW6TGZ8ZzM8KBH2l80x9AWdvCjsICuPIZRjc706HtkKZzTROtq6Z/F4Gm0uWRnwAZrHTRpnh8qjtdBLYFrdDcUoFtzOM6UVRmocTfsNe4ntPpvwY2aGTWY7EmTj1kteMJ+fCQFIS+KjyMWQHsN8yQNfD5/j2uv6/BdSkO8uorGSJT6DwmTECgYEA8ydoQ4i58+A1udqA+fujM0Zn46++NTehFe75nqIt8rfQgoduBam3lE5IWj2U2tLQeWxQyr1ZJkLbITtrAI3PgfMnuFAii+cncwFo805Fss/nbKx8K49vBuCEAq3MRhLjWy3ZvIgUHj67jWvl50dbNqc7TUguxhS4BxGr/cPPkP0CgYEA2nbJPGzSKhHTETL37NWIUAdU9q/6NVRISRRXeRqZYwE1VPzs2sIUxA8zEDBHX7OtvCKzvZy1Lg5Unx1nh4nCEVkbW/8npLlRG2jOcZJF6NRfhzwLz3WMIrP6j9SmjJaB+1mnrTjfsg36tDEPDjjJLjJHCx9z/qRJh1v4bh4aPpMCgYACG31T2IOEEZVlnvcvM3ceoqWT25oSbAEBZ6jSLyWmzOEJwJK7idUFfAg0gAQiQWF9K+snVqzHIB02FIXA43nA7pKRjmA+RiqZXJHEShFgk1y2HGiXGA8mSBvcyhTTJqbBy4vvjl5eRLzrZNwBPSUVPC3PZajCHrvZk9WhxWivIQKBgQCzCu1MH2dy4R7ZlqsIJ8zKweeJMZpfQI7pjclO0FTrhh7+Yzd+5db9A/P2jYrBTVHSwaILgTYf49DIguHJfEZXz26TzB7iapqlWxTukVHISt1ryPNo+E58VoLAhChnSiaHJ+g7GESE+d4A9cAACNwgh0YgQIvhIyW70M1e+j7KDwKBgQDQSBLFDFmvvTP3sIRAr1+0OZWd1eRcwdhs0U9GwootoCoUP/1Y64pqukT6B9oIB/No9Nyn8kUX3/ZDtCslaGKEUGMJXQ4hc5J+lq0tSi9ZWBdhqOuMPEfUF3IxW+9yeILP4ppUBn1m5MVOWg5CvuuEeCmy4bhMaUErUlHZ78t5cA==-----END RSA PRIVATE KEY-----";
const PK_A = EcPpk.fromPem(PEM).toPk().toPem();
// Any parseable public keys will do here; encryption is stubbed and keyed by PEM.
const PK_B = "-----BEGIN PUBLIC KEY-----MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAzzy0+Hau1QfZoZo/cUUaEdqWHoN3f+BezVUM8DZpxWrrnsKhKSV+ieEHZRduVM4LfxeByWhbzjkAvE8IWbQIGOA60UhZSjgjuSpNtlHRgmommkBtkvMN65TQwfuD6Z1GnPrE+T2PciKOPiiD5/5836zadSn4tMrM52jMZbUS/zi8P61y9TZejXI1KCgKYoi7po91eXmklTN192nG7iiOoUxz2TQFHG8VxqRi2UcBS+WuFEvLOayvCH5aZpZvN9GlR3EdbrCcZkDLFF9gict9Z3LbSWAe+0/RejgCe24MpfQsWnPNl/9ZSiFG7mbeH6G1hZl0Hahr+xBKrqdNMGfk8wIDAQAB-----END PUBLIC KEY-----";
const PK_C = "-----BEGIN PUBLIC KEY-----MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAr8oXR8sAu5zJvWk0BRbL/yFfz7zTv76nlwk498FqfyVtfnL13CAiwKWqDx6aNvlYXEVFvjMIclMkIFVqHFJRFBiVEQpuP//Ltd4WKzsRWlWWAGvNUfrgKMip62fZHQstC5MJUSDyCd3ljZe/1HjLFrvDsvjJ3o+GPOaJaHtlkz+Y0K7GrbBM4AzduzowNgcsHbmJ154QTTN6uw4ke1BAf3dRZ7ysyDKonJEtQGVGWvmYOOm5gwf5CHIqx7zp+zDROxzXvFHu0Wevh2WSzPO8u5cW3INe7kjgsG/mQm9QUW3m0+HT/wMh4WOTaR5yBwYMt7akC9Xs9zl2Vus80QQ4+QIDAQAB-----END PUBLIC KEY-----";

function typed(context, type) {
    const v = new EcEncryptedValue();
    v.encryptedContext = context;
    v.encryptedType = type;
    return v;
}

describe('EcEncryptedValue helpers', () => {
    afterEach(() => sinon.restore());

    describe('getEncryptedFullType / getEncryptedDottedType', () => {
        it('returns the type when there is no context or the type is already a URL', () => {
            assert.equal(typed(null, 'Thing').getEncryptedFullType(), 'Thing');
            assert.isUndefined(typed(undefined, undefined).getEncryptedFullType());
            assert.equal(typed('http://ctx/', 'https://other/Thing').getEncryptedFullType(), 'https://other/Thing');
            assert.equal(typed('http://ctx/', 'xhttpy').getEncryptedFullType(), 'xhttpy');
        });
        it('joins a string context and the type', () => {
            assert.equal(typed('http://ctx', 'Thing').getEncryptedFullType(), 'http://ctx/Thing');
            assert.equal(typed('http://ctx/', 'Thing').getEncryptedFullType(), 'http://ctx/Thing');
        });
        it('resolves prefixes and @vocab from an object context', () => {
            assert.equal(typed({ ce: 'https://ce.org/terms' }, 'ce:Thing').getEncryptedFullType(), 'https://ce.org/terms/Thing');
            assert.equal(typed({ ce: 'https://ce.org/terms/' }, 'ce:Thing').getEncryptedFullType(), 'https://ce.org/terms/Thing');
            assert.equal(typed({ '@vocab': 'https://v.org' }, 'Thing').getEncryptedFullType(), 'https://v.org/Thing');
            assert.throws(() => typed({ a: 'b' }, 'Thing').getEncryptedFullType(), TypeError);
        });
        it('dots the full type', () => {
            assert.equal(typed('https://schema.cassproject.org/0.4/', 'Competency').getEncryptedDottedType(), 'schema.cassproject.org.0.4.Competency');
            assert.equal(typed('http://a/b/', 'C').getEncryptedDottedType(), 'a.b.C');
            assert.equal(typed(null, 'x/y/z').getEncryptedDottedType(), 'x.y.z');
            assert.equal(typed(null, 'http://a/https://b/c').getEncryptedDottedType(), 'a.b.c');
        });
    });

    describe('isAnEncrypted', () => {
        it('compares the whole type or its last path segment', () => {
            assert.isFalse(new EcEncryptedValue().isAnEncrypted('http://a/Thing'));
            assert.isTrue(typed(null, 'Thing').isAnEncrypted('http://a/Thing'));
            assert.isTrue(typed(null, 'http://a/Thing').isAnEncrypted('http://a/Thing'));
            assert.isTrue(typed(null, 'Thing').isAnEncrypted('Thing'));
            assert.isFalse(typed(null, 'Thing').isAnEncrypted('http://a/Thing/'));
            assert.isFalse(typed(null, 'a').isAnEncrypted('http://a/Thing'));
        });
    });

    describe('encryptValueActual', () => {
        let reuse, map;
        beforeEach(() => {
            reuse = EcEncryptedValue.secretReuse;
            map = EcEncryptedValue.secretReuseMap;
            EcEncryptedValue.secretReuseMap = {};
            sinon.useFakeTimers({ now: 1000000, toFake: ['Date'] });
            sinon.stub(EcAesCtrAsyncWorker, 'encrypt').resolves('CIPHER');
            sinon.stub(EcRsaOaepAsyncWorker, 'encrypt').callsFake(async (pk, json) => 'E(' + pk.toPem().length + ')' + json);
        });
        afterEach(() => {
            EcEncryptedValue.secretReuse = reuse;
            EcEncryptedValue.secretReuseMap = map;
        });
        const secretJson = (s) => JSON.stringify({ v: s });

        it('encrypts the payload and the secret for each owner and reader', async () => {
            EcEncryptedValue.secretReuse = false;
            const v = new EcEncryptedValue();
            let seen = null;
            const r = await EcEncryptedValue.encryptValueActual(v, 'text', 'IV', 'SECRET', 'ID', [PK_A], [PK_B], (x) => { seen = x; return x; }, null);
            assert.strictEqual(r, v);
            assert.strictEqual(seen, v);
            assert.deepEqual(EcAesCtrAsyncWorker.encrypt.firstCall.args, ['text', 'SECRET', 'IV']);
            assert.equal(v.payload, 'CIPHER');
            assert.equal(v.iv, 'IV');
            assert.equal(v.id, 'ID');
            assert.deepEqual(v.owner, [PK_A]);
            assert.deepEqual(v.reader, [PK_B]);
            const calls = EcRsaOaepAsyncWorker.encrypt.getCalls();
            assert.deepEqual(calls.map((c) => c.args[0].toPem()), [PK_A, PK_B]);
            assert.include(calls[0].args[1], '"SECRET"');
            assert.deepEqual(v.secret, calls.map((c) => 'E(' + c.args[0].toPem().length + ')' + c.args[1]));
            assert.deepEqual(EcEncryptedValue.secretReuseMap, {});
        });
        it('handles missing owners and readers', async () => {
            EcEncryptedValue.secretReuse = false;
            const v = await EcEncryptedValue.encryptValueActual(new EcEncryptedValue(), 'text', 'IV', 'SECRET', 'ID', null, null);
            assert.isNull(v.owner);
            assert.isNull(v.reader);
            assert.deepEqual(v.secret, []);
        });
        it('without a reuse entry encrypts the secret every time', async () => {
            EcEncryptedValue.secretReuse = true;
            await EcEncryptedValue.encryptValueActual(new EcEncryptedValue(), 't', 'IV', 'S', 'ID', [PK_A], null);
            await EcEncryptedValue.encryptValueActual(new EcEncryptedValue(), 't', 'IV', 'S', 'ID', [PK_A], null);
            assert.equal(EcRsaOaepAsyncWorker.encrypt.callCount, 2);
            assert.deepEqual(EcEncryptedValue.secretReuseMap, {});
        });
        it('reuses the encrypted secret for a fresh entry with the same secret', async () => {
            EcEncryptedValue.secretReuse = true;
            const key = [PK_A, PK_B].join(',');
            const entry = { secret: 'S', expires: 1000001 };
            EcEncryptedValue.secretReuseMap[key] = entry;
            const v1 = await EcEncryptedValue.encryptValueActual(new EcEncryptedValue(), 't', 'IV', 'S', 'ID', [PK_A], [PK_B]);
            assert.deepEqual(Object.keys(entry.encryptedSecret), [PK_A, PK_B]);
            assert.instanceOf(entry.encryptedSecret[PK_A], Promise);
            const v2 = await EcEncryptedValue.encryptValueActual(new EcEncryptedValue(), 't2', 'IV2', 'S', 'ID2', [PK_A], [PK_B]);
            assert.equal(EcRsaOaepAsyncWorker.encrypt.callCount, 2);
            assert.deepEqual(v2.secret, v1.secret);
            assert.strictEqual(EcEncryptedValue.secretReuseMap[key], entry);
        });
        it('treats missing owners or readers as empty when looking up a reuse entry', async () => {
            EcEncryptedValue.secretReuse = true;
            const entryB = { secret: 'S', expires: 2000000 };
            EcEncryptedValue.secretReuseMap[PK_B] = entryB;
            let v = await EcEncryptedValue.encryptValueActual(new EcEncryptedValue(), 't', 'IV', 'S', 'ID', null, [PK_B]);
            assert.isNull(v.owner);
            assert.deepEqual(Object.keys(entryB.encryptedSecret), [PK_B]);
            const entryA = { secret: 'S', expires: 2000000, encryptedSecret: { [PK_A]: Promise.resolve('CACHED') } };
            EcEncryptedValue.secretReuseMap[PK_A] = entryA;
            v = await EcEncryptedValue.encryptValueActual(new EcEncryptedValue(), 't', 'IV', 'S', 'ID', [PK_A], null);
            assert.isNull(v.reader);
            assert.deepEqual(v.secret, ['CACHED']);
            assert.equal(EcRsaOaepAsyncWorker.encrypt.callCount, 1);
        });
        it('drops a reuse entry with another secret or that has expired', async () => {
            EcEncryptedValue.secretReuse = true;
            EcEncryptedValue.secretReuseMap[PK_A] = { secret: 'OTHER', expires: 2000000 };
            let v = await EcEncryptedValue.encryptValueActual(new EcEncryptedValue(), 't', 'IV', 'S', 'ID', [PK_A], null);
            assert.notProperty(EcEncryptedValue.secretReuseMap, PK_A);
            assert.equal(v.secret.length, 1);
            EcEncryptedValue.secretReuseMap[PK_A] = { secret: 'S', expires: 1000000 };
            v = await EcEncryptedValue.encryptValueActual(new EcEncryptedValue(), 't', 'IV', 'S', 'ID', [PK_A], null);
            assert.notProperty(EcEncryptedValue.secretReuseMap, PK_A);
            assert.equal(EcRsaOaepAsyncWorker.encrypt.callCount, 2);
        });
        it('drops a mismatched entry once and encrypts for every key', async () => {
            EcEncryptedValue.secretReuse = true;
            const key = [PK_A, PK_B].join(',');
            EcEncryptedValue.secretReuseMap[key] = { secret: 'S', expires: 1000001 };
            const v = await EcEncryptedValue.encryptValueActual(new EcEncryptedValue(), 't', 'IV', 'OTHER', 'ID', [PK_A], [PK_B]);
            assert.notProperty(EcEncryptedValue.secretReuseMap, key);
            assert.equal(v.secret.length, 2);
            assert.equal(EcRsaOaepAsyncWorker.encrypt.callCount, 2);
        });
        it('rejects when the payload cannot be encrypted', async () => {
            EcAesCtrAsyncWorker.encrypt.rejects(new Error('aes'));
            let failed = null;
            await EcEncryptedValue.encryptValueActual(new EcEncryptedValue(), 't', 'IV', 'S', 'ID', [PK_A], null, null, (e) => { failed = e; });
            assert.equal(failed.message, 'aes');
        });
    });

    describe('addReader / removeReader', () => {
        function value() {
            const v = new EcEncryptedValue();
            v.owner = [PK_A];
            v.reader = [PK_B];
            v.secret = ['sA', 'sB'];
            return v;
        }
        const secret = { toEncryptableJson: () => 'JSON' };

        it('addReader rejects with a string when the secret is unknown', async () => {
            const v = value();
            sinon.stub(v, 'decryptSecret').resolves(null);
            const e = await v.addReader(EcPk.fromPem(PK_C)).catch((x) => x);
            assert.strictEqual(e, "Cannot add a Reader if you don't know the secret");
            assert.deepEqual(v.reader, [PK_B, PK_C]);
            assert.deepEqual(v.secret, ['sA', 'sB']);
        });
        it('addReader encrypts the secret for the new reader', async () => {
            const v = value();
            const eim = {};
            const decrypt = sinon.stub(v, 'decryptSecret').resolves(secret);
            const encrypt = sinon.stub(EcRsaOaepAsyncWorker, 'encrypt').resolves('sC');
            const pkC = EcPk.fromPem(PK_C);
            const r = await v.addReader(pkC, eim);
            assert.isUndefined(r);
            assert.strictEqual(decrypt.firstCall.args[0], eim);
            assert.strictEqual(encrypt.firstCall.args[0], pkC);
            assert.equal(encrypt.firstCall.args[1], 'JSON');
            assert.deepEqual(v.reader, [PK_B, PK_C]);
            assert.deepEqual(v.secret, ['sA', 'sB', 'sC']);
            await v.addReader(pkC, eim);
            assert.deepEqual(v.secret, ['sA', 'sB', 'sC']);
        });
        it('addReader rejects when encryption fails', async () => {
            const v = value();
            sinon.stub(v, 'decryptSecret').resolves(secret);
            sinon.stub(EcRsaOaepAsyncWorker, 'encrypt').rejects(new Error('rsa'));
            const e = await v.addReader(EcPk.fromPem(PK_C)).catch((x) => x);
            assert.equal(e.message, 'rsa');
        });
        it('removeReader re-encrypts the secret for the remaining owners and readers', async () => {
            const v = value();
            v.reader = [PK_B, PK_C];
            sinon.stub(v, 'decryptSecret').resolves(secret);
            sinon.stub(EcRsaOaepAsyncWorker, 'encrypt').callsFake(async (pk) => 'for ' + pk.toPem().length + pk.toPem().slice(-30));
            const r = await v.removeReader(EcPk.fromPem(PK_B));
            assert.isUndefined(r);
            assert.deepEqual(v.reader, [PK_C]);
            assert.deepEqual(v.secret, [PK_A, PK_C].map((p) => 'for ' + p.length + p.slice(-30)));
        });
        it('removeReader with no readers re-encrypts for owners only', async () => {
            const v = value();
            v.reader = null;
            sinon.stub(v, 'decryptSecret').resolves(secret);
            sinon.stub(EcRsaOaepAsyncWorker, 'encrypt').resolves('x');
            await v.removeReader(EcPk.fromPem(PK_B));
            assert.isNull(v.reader);
            assert.deepEqual(v.secret, ['x']);
        });
        it('removeReader rejects when the secret is unknown', async () => {
            const v = value();
            sinon.stub(v, 'decryptSecret').resolves(null);
            const e = await v.removeReader(EcPk.fromPem(PK_B)).catch((x) => x);
            assert.instanceOf(e, TypeError);
            assert.deepEqual(v.secret, []);
        });
    });
});
