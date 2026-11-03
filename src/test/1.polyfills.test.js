require('../../index.js');
const chai = require('chai');
const sinon = require('sinon');
const EcRepository = require('../org/cassproject/ebac/repository/EcRepository.js');
const EcRemoteLinkedData = require('../org/cassproject/schema/general/EcRemoteLinkedData.js');

const assert = chai.assert;

describe('Number polyfills', () => {
    it('Number.parseInt and Number.parseFloat are the global functions', () => {
        assert.strictEqual(Number.parseInt, parseInt);
        assert.strictEqual(Number.parseFloat, parseFloat);
    });
    it('intValue, shortValue, longValue and byteValue truncate like parseInt', () => {
        for (const fn of ['intValue', 'shortValue', 'longValue', 'byteValue']) {
            assert.strictEqual((3.7)[fn](), 3, fn);
            assert.strictEqual((-3.7)[fn](), -3, fn);
            assert.strictEqual((1e21)[fn](), 1, fn); // parseInt("1e+21")
            assert.isNaN((NaN)[fn](), fn);
        }
    });
    it('floatValue and doubleValue parse like parseFloat', () => {
        for (const fn of ['floatValue', 'doubleValue']) {
            assert.strictEqual((3.5)[fn](), 3.5, fn);
            assert.strictEqual((1e21)[fn](), 1e21, fn);
            assert.isNaN((NaN)[fn](), fn);
        }
    });
    it('Number.parseShort, parseLong, parseByte and parseDouble parse strings', () => {
        assert.strictEqual(Number.parseShort('12px'), 12);
        assert.strictEqual(Number.parseLong('-0x1F'), -31);
        assert.strictEqual(Number.parseByte('08'), 8);
        assert.isNaN(Number.parseByte('px'));
        assert.strictEqual(Number.parseDouble('1.5e3x'), 1500);
        assert.isNaN(Number.parseDouble(''));
    });
    it('Number.prototype.isNaN reports NaN', () => {
        assert.isTrue((NaN).isNaN());
        assert.isTrue(Number.prototype.isNaN.call(NaN));
        assert.isFalse((5).isNaN());
        assert.isFalse((Infinity).isNaN());
        assert.isFalse(Number.prototype.isNaN.call(0));
    });
});

describe('String polyfills', () => {
    it('trim removes leading and trailing whitespace', () => {
        assert.equal('  \t a b \n\r '.trim(), 'a b');
        assert.equal(''.trim(), '');
        assert.equal('   '.trim(), '');
    });
});

describe('EcRemoteLinkedData.getVersionFromUrl', () => {
    it('parses a numeric last path segment', () => {
        assert.strictEqual(EcRemoteLinkedData.getVersionFromUrl('https://x/api/data/a/b/123'), 123);
        assert.strictEqual(EcRemoteLinkedData.getVersionFromUrl('https://x/api/data/a/b/0012'), 12);
        assert.strictEqual(EcRemoteLinkedData.getVersionFromUrl('https://x/api/data/a/b/99999999999999999999'), 100000000000000000000);
    });
    it('returns null otherwise', () => {
        assert.isNull(EcRemoteLinkedData.getVersionFromUrl('https://x/api/data/a/b'));
        assert.isNull(EcRemoteLinkedData.getVersionFromUrl('https://x/api/data/a/b/12a'));
        assert.isNull(EcRemoteLinkedData.getVersionFromUrl(null));
        assert.isNull(EcRemoteLinkedData.getVersionFromUrl(''));
    });
});

describe('EcRepository.find counter guard', () => {
    let repos;
    before(() => {
        repos = EcRepository.repos;
        // A repository with no server makes find move on to the next counter.
        EcRepository.repos = [{ selectedServer: null }];
    });
    after(() => {
        EcRepository.repos = repos;
    });
    afterEach(() => sinon.restore());

    for (const [counter, calls] of [[0, 2], ['0', 2], [undefined, 1], [null, 1], [NaN, 1], ['abc', 1], [{}, 1], [5, 1]]) {
        it(`counter ${typeof counter === 'string' ? `'${counter}'` : String(counter)} makes ${calls} call(s) and finds nothing`, async () => {
            const spy = sinon.spy(EcRepository, 'find');
            let error;
            await EcRepository.find('https://x/api/data/missing', 'not found', {}, counter).catch((e) => { error = e; });
            assert.equal(error && error.message, 'not found');
            assert.equal(spy.callCount, calls);
        });
    }
});
