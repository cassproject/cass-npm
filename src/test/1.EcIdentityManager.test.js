const chai = require("chai");
const EcRsaOaepAsyncWorker = require("../com/eduworks/ec/crypto/EcRsaOaepAsyncWorker");
const EcPpkFacade = require("../com/eduworks/ec/crypto/EcPpkFacade");

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

after(()=>EcRsaOaepAsyncWorker.teardown());

describe("EcIdentityManager", () => {
    it('real simple stuff', () => {
        assert.isTrue(new EcPpkFacade() instanceof EcPpkFacade);
    })
    it('real simple stuff 2', () => {
        assert.isTrue(new EcPpkFacade() instanceof require("../com/eduworks/ec/crypto/EcPpkFacade"));
    })
    it('real simple stuff 3', () => {
        assert.isTrue(new (require("../com/eduworks/ec/crypto/EcPpkFacade"))() instanceof require("../com/eduworks/ec/crypto/EcPpkFacade"));
    })
}); 