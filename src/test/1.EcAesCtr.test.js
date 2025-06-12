let chai = require("chai");
const EcAes = require("../com/eduworks/ec/crypto/EcAes");
const EcAesCtr = require("../com/eduworks/ec/crypto/EcAesCtr");
const EcCrypto = require("../com/eduworks/ec/crypto/EcCrypto");

let hrtime = function () {
    try {
        return [Math.round(performance.now() / 1000), performance.now() * 1000];
    } catch (e) {
        try {
            if (typeof process !== 'undefined')	
                return process.hrtime();
            return [new Date().getTime(), new Date().getTime() * 1000];
        }
        catch (ex) {
            return [new Date().getTime(), new Date().getTime() * 1000];
        }
    }
};

let should = chai.should();
let expect = chai.expect;
let assert = chai.assert;

describe("EcAesCtr", () => {
    it('encryption then decryption', () => {
        let randomString = EcAes.newIv(1024);
        let secret = EcAes.newSecret(16);
        let iv = EcAes.newIv(16);
        let encrypted = EcAesCtr.encrypt(randomString, secret, iv); //NOSONAR
        let decrypted = EcAesCtr.decrypt(encrypted, secret, iv); //NOSONAR
        assert.isTrue(randomString == decrypted);
    });
    it('encryption then decryption (utf-8)', () => {
        let randomString =
            "abc\u16a0\u16c7\u16bb\u16eb\u16d2\u16e6\u16a6\u16eb\u16a0\u16b1\u16a9\u16a0\u16a2\u16b1\u16eb\u16a0\u16c1\u16b1\u16aa\u16eb\u16b7\u16d6\u16bb\u16b9\u16e6\u16da\u16b3\u16a2\u16d7";
        let secret = EcAes.newSecret(16);
        let iv = EcAes.newIv(16);
        let encrypted = EcAesCtr.encrypt(randomString, secret, iv); //NOSONAR
        let decrypted = EcAesCtr.decrypt(encrypted, secret, iv); //NOSONAR
        assert.isTrue(randomString == decrypted);
    });
    it('large encryption then decryption w/caching', () => {
        let randomString = EcAes.newIv(4096*16);
        let secret = EcAes.newSecret(16);
        let iv = EcAes.newIv(16);
        let hrTime = hrtime();
        let encrypted = EcAesCtr.encrypt(randomString, secret, iv); //NOSONAR
        let elapsed = (hrtime()[0]*1000000 + hrtime()[1]/1000 - hrTime[0] * 1000000 - hrTime[1] / 1000)/1000;
        console.log(randomString.length/1024+"KB encryption speed: " + elapsed+"ms");
        hrTime = hrtime();
        EcCrypto.caching = true;
        let decrypted = EcAesCtr.decrypt(encrypted, secret, iv); //NOSONAR
        elapsed = (hrtime()[0]*1000000 + hrtime()[1]/1000 - hrTime[0] * 1000000 - hrTime[1] / 1000)/1000;
        console.log("decryption wout/caching speed: " + elapsed+"ms");
        hrTime = hrtime();
        decrypted = null;
        decrypted = EcAesCtr.decrypt(encrypted, secret, iv); //NOSONAR
        elapsed = (hrtime()[0]*1000000 + hrtime()[1]/1000 - hrTime[0] * 1000000 - hrTime[1] / 1000)/1000;
        console.log("decryption w/caching speed: " + elapsed+"ms");
        assert.isTrue(elapsed < 1);
        assert.isTrue(randomString == decrypted);
    });
});