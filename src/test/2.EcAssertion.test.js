const chai = require('chai');
const sinon = require('sinon');
const EcAssertion = require('../org/cass/profile/EcAssertion');
const EcRepository = require('../org/cassproject/ebac/repository/EcRepository');
const EcPpk = require('../com/eduworks/ec/crypto/EcPpk');
const Assertion = require('../org/cassproject/schema/cass/profile/Assertion');

const expect = chai.expect;

describe('EcAssertion', function () {
    let assertion;

    beforeEach(function () {
        assertion = new EcAssertion();
    });

    describe('equals', function () {
        it('should return true if ids are equal', function () {
            assertion.id = 'testId';
            const obj = { id: 'testId' };
            expect(assertion.equals(obj)).to.be.true;
        });

        it('should return false if ids are not equal', function () {
            assertion.id = 'testId';
            const obj = { id: 'differentId' };
            expect(assertion.equals(obj)).to.be.false;
        });
    });

    describe('decrypt', function () {
        it('should decrypt and return a new assertion', async function () {
            let subject = EcPpk.generateKey();
            let agent = EcPpk.generateKey();
            sinon.stub(assertion, 'getSubject').resolves(subject.toPk());
            sinon.stub(assertion, 'getAgent').resolves(agent.toPk());
            sinon.stub(assertion, 'getAssertionDate').resolves(1234);
            sinon.stub(assertion, 'getExpirationDate').resolves(2345);
            sinon.stub(assertion, 'getEvidences').resolves('evidences');
            sinon.stub(assertion, 'getNegative').resolves(true);
            sinon.stub(assertion, 'getDecayFunction').resolves('decayFunction');

            const decryptedAssertion = await assertion.decrypt();

            expect(decryptedAssertion).to.be.an.instanceof(Assertion);
            expect(decryptedAssertion.subject).to.equal(subject.toPk().toPem());
            expect(decryptedAssertion.agent).to.equal(agent.toPk().toPem());
            expect(decryptedAssertion.assertionDate).to.equal(1234);
            expect(decryptedAssertion.expirationDate).to.equal(2345);
            expect(decryptedAssertion.evidence).to.equal('evidences');
            expect(decryptedAssertion.negative).to.equal(true);
            expect(decryptedAssertion.decayFunction).to.equal('decayFunction');
        });
    });

    describe('get', function () {
        it('should call EcRepository.getAs with correct parameters', function () {
            const getAsStub = sinon.stub(EcRepository, 'getAs');
            const success = sinon.spy();
            const failure = sinon.spy();
            const repo = {};
            const eim = {};

            EcAssertion.get('testId', success, failure, repo, eim);

            expect(getAsStub.calledOnce).to.be.true;
            expect(getAsStub.calledWith('testId', sinon.match.instanceOf(EcAssertion), success, failure, repo, eim)).to.be.true;

            getAsStub.restore();
        });
    });

    describe('search', function () {
        it('should call EcRepository.searchAs with correct parameters', function () {
            const searchAsStub = sinon.stub(EcRepository, 'searchAs');
            const success = sinon.spy();
            const failure = sinon.spy();
            const repo = {};
            const query = 'testQuery';
            const paramObj = {};
            const eim = {};

            EcAssertion.search(repo, query, success, failure, paramObj, eim);

            expect(searchAsStub.calledOnce).to.be.true;
            expect(searchAsStub.calledWith(repo, query, sinon.match.func, success, failure, paramObj, eim)).to.be.true;

            searchAsStub.restore();
        });
    });

    // Add more tests for other methods as needed
});