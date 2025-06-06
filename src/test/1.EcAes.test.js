let chai = require("chai");
const EcAes = require("../com/eduworks/ec/crypto/EcAes");

let expect = chai.expect;
let assert = chai.assert;

describe("EcAes", () => {
    it('newSecret != null', () => {
        expect(EcAes.newSecret(5)).not.to.equal(null);
    });
    it('newSecret length is right', () => {
        expect(EcAes.newSecret(5).length).to.equal(8);
    });
    it('newSecret validates parameters', () => {
        try {
            EcAes.newSecret();
            assert.fail("Should throw exception.");
        } catch (error) {
            expect(error.toString()).to.include("Undefined secret length.");
        }
    });
    it('newIv != null', () => {
        expect(EcAes.newIv(6)).not.to.equal(null);
    });
    it('newIv length is right', () => {
        expect(EcAes.newIv(6).length).to.equal(8);
    });
    it('newIv validates parameters', () => {
        try {
            EcAes.newIv();
            assert.fail("Should throw exception.");
        } catch (error) {
            expect(error.toString()).to.include("Undefined iv length.");
        }
    });
});