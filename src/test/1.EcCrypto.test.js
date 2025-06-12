let EcCrypto = require("../com/eduworks/ec/crypto/EcCrypto.js");
let EcAes = require("../com/eduworks/ec/crypto/EcAes.js");
let chai = require("chai");

try {
    global.crypto = null;
    global.crypto = require('crypto').webcrypto;
} catch (err) {
    console.log("Webcrypto not available. Tests will fail. Please upgrade, if possible, to Node 16. Non-test mode will fallback to slower cryptograpy methods.: " + err);
}

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

describe("EcPpk", () => {
    it('random', ()=>{
        let one = EcCrypto.generateUUID();
        let two = EcCrypto.generateUUID();
        console.log(one,two);
        assert.isTrue(one != two);
    });
    it('md5', async () => {
        let randomString = EcAes.newIv(4096*4);
        let hrTime = hrtime();
        EcCrypto.caching = true;
        EcCrypto.md5(randomString);
        let elapsed = (hrtime()[0]*1000000 + hrtime()[1]/1000 - hrTime[0] * 1000000 - hrTime[1] / 1000)/1000;
        console.log(randomString.length/1024+"KB md5 speed: " + elapsed+"ms");
        hrTime = hrtime();
        EcCrypto.md5(randomString);
        elapsed = (hrtime()[0]*1000000 + hrtime()[1]/1000 - hrTime[0] * 1000000 - hrTime[1] / 1000)/1000;
        console.log("md5 w/caching speed: " + elapsed+"ms");
        assert.isTrue(elapsed < 1);
        EcCrypto.caching = false;
    });
    it('sha256', async () => {
        let randomString = EcAes.newIv(4096*4);
        let hrTime = hrtime();
        EcCrypto.caching = true;
        EcCrypto.sha256(randomString);
        let elapsed = (hrtime()[0]*1000000 + hrtime()[1]/1000 - hrTime[0] * 1000000 - hrTime[1] / 1000)/1000;
        console.log(randomString.length/1024+"KB sha256 speed: " + elapsed+"ms");
        hrTime = hrtime();
        EcCrypto.sha256(randomString);
        elapsed = (hrtime()[0]*1000000 + hrtime()[1]/1000 - hrTime[0] * 1000000 - hrTime[1] / 1000)/1000;
        console.log("sha256 w/caching speed: " + elapsed+"ms");
        assert.isTrue(elapsed < 1);
        EcCrypto.caching = false;
    });
});