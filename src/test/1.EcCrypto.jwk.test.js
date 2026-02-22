let EcPpk = require("../com/eduworks/ec/crypto/EcPpk.js");
let EcRsaOaepAsync = require("../com/eduworks/ec/crypto/EcRsaOaepAsync.js");
let EcAes = require("../com/eduworks/ec/crypto/EcAes.js");
let chai = require("chai");

let assert = chai.assert;

describe("EcCrypto JWK", () => {
    let ppk = null;
    let pk = null;

    before(async function () {
        this.timeout(10000);
        ppk = await EcPpk.generateKeyAsync();
        pk = ppk.toPk();
    });

    it('EcPpk.toJwk is valid', () => {
        let jwk = ppk.toJwk();
        assert.isNotNull(jwk);
        assert.isObject(jwk);
        assert.equal(jwk.kty, "RSA");
        assert.isString(jwk.n);
        assert.isString(jwk.e);
        assert.isString(jwk.d);
        assert.isString(jwk.p);
        assert.isString(jwk.q);
    });

    it('EcPk.toJwk is valid', () => {
        let jwk = pk.toJwk();
        assert.isNotNull(jwk);
        assert.isObject(jwk);
        assert.equal(jwk.kty, "RSA");
        assert.isString(jwk.n);
        assert.isString(jwk.e);
        assert.isUndefined(jwk.d);
    });

    it('EcRsaOaepAsync.encrypt/decrypt works with generated JWK', async () => {
        let randomString = EcAes.newIv(256).substring(0, 190);

        // The verify functions in EcRsaOaepAsync automatically use toJwk() 
        // behind the scenes when ppk.key is null, so by passing our newly 
        // generated keys, we are implicitly testing that the JWK format generated 
        // by `.toJwk()` is perfectly valid for use with crypto.subtle.

        let encrypted = await EcRsaOaepAsync.encrypt(pk, randomString);
        let decrypted = await EcRsaOaepAsync.decrypt(ppk, encrypted);

        assert.isTrue(randomString === decrypted, "Decrypted string should match original");
    });

    it('EcRsaOaepAsync.signSha256/verifySha256 works with generated JWK', async () => {
        let randomString = EcAes.newIv(256 * 4);

        let signature = await EcRsaOaepAsync.signSha256(ppk, randomString);
        let verified = await EcRsaOaepAsync.verifySha256(pk, randomString, signature);

        assert.isTrue(verified, "Signature should be successfully verified");
    });
});
