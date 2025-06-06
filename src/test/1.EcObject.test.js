let chai = require("chai");
const EcObject = require("../com/eduworks/ec/array/EcObject");

let should = chai.should();
let expect = chai.expect;
let assert = chai.assert;

describe("EcObject", () => {
    describe("isObject", () => {
        it('Array is not Object', () => {
            expect(EcObject.isObject([])).to.equal(false);
        });
        it('Object is Object', () => {
            expect(EcObject.isObject({})).to.equal(true);
        });
        it('String is not Object', () => {
            expect(EcObject.isObject("[]")).to.equal(false);
        });
    });
});