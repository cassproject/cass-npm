let chai = require("chai");
const EcArray = require("../com/eduworks/ec/array/EcArray.js");

let should = chai.should();
let expect = chai.expect;
let assert = chai.assert;

describe("EcArray", () => {
    describe("isArray", () => {
        it('Array is Array', () => {
            expect(EcArray.isArray([])).to.equal(true);
        });
        it('Object is not Array', () => {
            expect(EcArray.isArray({})).to.equal(false);
        });
        it('String is not Array', () => {
            expect(EcArray.isArray("[]")).to.equal(false);
        });
    });
    it('Duplicates are removed', () => {
        let ary = [1, 1, 2, 3, 4];
        EcArray.removeDuplicates(ary);
        expect(ary.length).to.equal(4);
    });
    describe("removeDuplicates", () => {
        it('Removes duplicates from the array', () => {
            let ary = [1, 1, 2, 3, 4];
            EcArray.removeDuplicates(ary);
            expect(ary).to.deep.equal([1, 2, 3, 4]);
        });
        it('Does not modify the array if there are no duplicates', () => {
            let ary = [1, 2, 3, 4];
            EcArray.removeDuplicates(ary);
            expect(ary).to.deep.equal([1, 2, 3, 4]);
        });
        it('Handles empty array correctly', () => {
            let ary = [];
            EcArray.removeDuplicates(ary);
            expect(ary).to.deep.equal([]);
        });
    });
    describe("setAdd", () => {
        it('SetAdd works', () => {
            let ary = [2, 3, 4];
            EcArray.setAdd(ary, 1);
            expect(ary.length).to.equal(4);
        });
        it('SetAdd doesnt duplicate', () => {
            let ary = [1, 1, 2, 3, 4];
            EcArray.setAdd(ary, 1);
            expect(ary.length).to.equal(5);
        });
        it('Adds a value to the array if it is not already present', () => {
            let ary = [2, 3, 4];
            EcArray.setAdd(ary, 1);
            expect(ary).to.deep.equal([2, 3, 4, 1]);
        });
        it('Does not add a value to the array if it is already present', () => {
            let ary = [1, 2, 3, 4];
            EcArray.setAdd(ary, 1);
            expect(ary).to.deep.equal([1, 2, 3, 4]);
        });
    });
    describe("setRemove", () => {
        it('Removes a value from the array', () => {
            let ary = [1, 2, 3, 4];
            EcArray.setRemove(ary, 2);
            expect(ary).to.deep.equal([1, 3, 4]);
        });
        it('Does not modify the array if the value is not present', () => {
            let ary = [1, 2, 3, 4];
            EcArray.setRemove(ary, 5);
            expect(ary).to.deep.equal([1, 2, 3, 4]);
        });
        it('Removes all occurrences of a value from the array', () => {
            let ary = [1, 2, 2, 3, 4];
            EcArray.setRemove(ary, 2);
            expect(ary).to.deep.equal([1, 3, 4]);
        });
        it('Handles empty array correctly', () => {
            let ary = [];
            EcArray.setRemove(ary, 1);
            expect(ary).to.deep.equal([]);
        });
        it('SetRemove works', () => {
            let ary = [1, 2, 3, 4];
            EcArray.setRemove(ary, 1);
            expect(ary.length).to.equal(3);
        });
        it('SetRemove doesnt remove things of different types', () => {
            let ary = ['1', 2, 3, 4];
            EcArray.setRemove(ary, 1);
            expect(ary.length).to.equal(4);
        });
        it('SetRemove removes all of something', () => {
            let ary = [1, 1, 2, 3, 4];
            EcArray.setRemove(ary, 1);
            expect(ary.length).to.equal(3);
        });
    });
});