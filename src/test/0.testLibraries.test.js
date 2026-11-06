// Checks that the parts of chai and sinon these tests rely on still behave as
// expected, so an upgrade cannot make assertions pass for the wrong reason.
const chai = require('chai');
const sinon = require('sinon');

const assert = chai.assert;
const expect = chai.expect;

// Runs fn and returns its chai AssertionError, failing if it did not throw one.
function failure(fn) {
    try {
        fn();
    } catch (e) {
        if (e instanceof chai.AssertionError) return e;
        throw e;
    }
    throw new Error('assertion did not fail');
}

describe('chai', () => {
    it('assert passes and fails as expected', () => {
        assert.equal(1, '1');
        failure(() => assert.equal(1, 2));
        assert.strictEqual(1, 1);
        failure(() => assert.strictEqual(1, '1'));
        assert.deepEqual({ a: [1, { b: 2 }] }, { a: [1, { b: 2 }] });
        failure(() => assert.deepEqual({ a: [1] }, { a: [2] }));
        assert.notEqual(1, 2);
        failure(() => assert.notEqual(1, 1));
        assert.isTrue(true);
        failure(() => assert.isTrue(1));
        assert.isFalse(false);
        failure(() => assert.isFalse(0));
        assert.isNull(null);
        failure(() => assert.isNull(undefined));
        assert.isNotNull(0);
        failure(() => assert.isNotNull(null));
        assert.isUndefined(undefined);
        failure(() => assert.isUndefined(null));
        assert.isDefined(null);
        failure(() => assert.isDefined(undefined));
        assert.isString('s');
        failure(() => assert.isString(1));
        assert.isObject({});
        failure(() => assert.isObject('s'));
        assert.isFunction(() => 0);
        failure(() => assert.isFunction({}));
        assert.isNaN(NaN);
        failure(() => assert.isNaN(1));
        assert.isAbove(2, 1);
        failure(() => assert.isAbove(1, 1));
        assert.isBelow(1, 2);
        failure(() => assert.isBelow(2, 2));
        assert.include([1, 2], 2);
        assert.include('abc', 'b');
        failure(() => assert.include([1, 2], 3));
        assert.match('abc', /b/);
        failure(() => assert.match('abc', /d/));
        assert.lengthOf([1, 2], 2);
        failure(() => assert.lengthOf([1], 2));
        assert.exists(0);
        failure(() => assert.exists(null));
        class A { }
        class B extends A { }
        assert.instanceOf(new B(), A);
        failure(() => assert.instanceOf({}, A));
        assert.notInstanceOf(new A(), B);
        failure(() => assert.notInstanceOf(new B(), A));
        failure(() => assert.fail('message'));
        assert.equal(failure(() => assert.fail('message')).message, 'message');
    });

    it('expect passes and fails as expected', () => {
        expect(1).to.equal(1);
        failure(() => expect(1).to.equal(2));
        expect({ a: [1] }).to.deep.equal({ a: [1] });
        failure(() => expect({ a: [1] }).to.deep.equal({ a: [2] }));
        expect(true).to.be.true;
        failure(() => expect(1).to.be.true);
        expect(false).to.be.false;
        failure(() => expect(0).to.be.false);
        expect([1]).to.be.an('array').with.lengthOf(1);
        failure(() => expect([1]).to.be.an('array').with.lengthOf(2));
        expect('s').to.be.a('string');
        failure(() => expect(1).to.be.a('string'));
        expect(new Date()).to.be.an.instanceof(Date);
        failure(() => expect({}).to.be.an.instanceof(Date));
        expect('Row 2: x').to.contain('Row 2');
        failure(() => expect('Row 2').to.contain('Row 3'));
        expect([1, 2]).to.include(2);
        failure(() => expect([1, 2]).to.include(3));
        expect([1, 2]).to.not.include(3);
        failure(() => expect([1, 2]).to.not.include(2));
    });

    it('should is available', () => {
        const should = chai.should();
        (1).should.equal(1);
        failure(() => (1).should.equal(2));
        should.not.exist(null);
    });
});

describe('sinon', () => {
    afterEach(() => sinon.restore());

    it('spies record calls and arguments', () => {
        const target = { f: (a) => a * 2 };
        const spy = sinon.spy(target, 'f');
        assert.isFalse(spy.called);
        assert.equal(target.f(3), 6);
        assert.isTrue(spy.called);
        assert.isTrue(spy.calledOnce);
        assert.equal(spy.callCount, 1);
        assert.isTrue(spy.calledWith(3));
        assert.isFalse(spy.calledWith(4));
        assert.deepEqual(spy.firstCall.args, [3]);
        assert.isTrue(spy.calledWith(sinon.match.any));
        assert.isTrue(spy.calledWith(sinon.match.number));
        assert.isFalse(spy.calledWith(sinon.match.string));
    });

    it('stubs resolve, reject, return and call fakes', async () => {
        const target = { a: () => 1, b: () => 1, c: () => 1, d: () => 1 };
        sinon.stub(target, 'a').resolves(5);
        sinon.stub(target, 'b').rejects(new Error('no'));
        sinon.stub(target, 'c').returns(7);
        sinon.stub(target, 'd').callsFake((x) => x + 1);
        assert.equal(await target.a(), 5);
        let error;
        await target.b().catch((e) => { error = e; });
        assert.equal(error.message, 'no');
        assert.equal(target.c(), 7);
        assert.equal(target.d(1), 2);
    });

    it('stubs can be changed after creation and expose the original', () => {
        const target = { f: () => 'original' };
        const stub = sinon.stub(target, 'f').returns('first');
        assert.equal(target.f(), 'first');
        stub.callsFake(() => 'second');
        assert.equal(target.f(), 'second');
        assert.equal(stub.wrappedMethod(), 'original');
        stub.rejects(new Error('later'));
        return target.f().then(() => assert.fail('should reject'), (e) => assert.equal(e.message, 'later'));
    });

    it('restores originals, individually and all at once', () => {
        const target = { f: () => 'f', g: () => 'g' };
        const f = sinon.stub(target, 'f').returns('stubbed');
        sinon.stub(target, 'g').returns('stubbed');
        f.restore();
        assert.equal(target.f(), 'f');
        assert.equal(target.g(), 'stubbed');
        sinon.restore();
        assert.equal(target.g(), 'g');
        assert.isUndefined(target.f.restore);
    });

    it('fake timers freeze the clock and restore it', () => {
        const clock = sinon.useFakeTimers({ now: 1700000000000 });
        try {
            assert.equal(new Date().getTime(), 1700000000000);
            assert.equal(Date.now(), 1700000000000);
            clock.tick(5);
            assert.equal(Date.now(), 1700000000005);
        } finally {
            clock.restore();
        }
        assert.isAbove(Date.now(), 1700000000005);
    });
});
