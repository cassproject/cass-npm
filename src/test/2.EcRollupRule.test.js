const chai = require('chai');
const sinon = require('sinon');
const EcRepository = require('../org/cassproject/ebac/repository/EcRepository');
const EcRollupRule = require('../org/cass/competency/EcRollupRule');
const expect = chai.expect;

describe('EcRollupRule', function () {
    describe('get', function () {
        it('should retrieve a rollup rule from the server', function (done) {
            const id = 'testId';
            const success = sinon.spy();
            const failure = sinon.spy();
            const repo = {};
            const eim = {};

            sinon.stub(EcRepository, 'getAs').callsFake((id, obj, successCallback, failureCallback, repo, eim) => {
                successCallback(obj);
            });

            EcRollupRule.get(id, success, failure, repo, eim);

            expect(success.calledOnce).to.be.true;
            expect(failure.called).to.be.false;
            EcRepository.getAs.restore();
            done();
        });
    });

    describe('getBlocking', function () {
        it('should retrieve a rollup rule from the server without callbacks', function () {
            const id = 'testId';
            const repo = {};
            const eim = {};

            sinon.stub(EcRepository, 'getAs').returns(new EcRollupRule());

            const result = EcRollupRule.getBlocking(id, repo, eim);

            expect(result).to.be.an.instanceof(EcRollupRule);
            EcRepository.getAs.restore();
        });
    });

    describe('search', function () {
        it('should search for rollup rules with a query', function (done) {
            const repo = {};
            const query = 'testQuery';
            const success = sinon.spy();
            const failure = sinon.spy();
            const paramObj = {};
            const eim = {};

            sinon.stub(EcRepository, 'searchAs').callsFake((repo, query, objFactory, successCallback, failureCallback, paramObj, eim) => {
                successCallback([objFactory()]);
            });

            EcRollupRule.search(repo, query, success, failure, paramObj, eim);

            expect(success.calledOnce).to.be.true;
            expect(success.args[0][0][0]).to.be.an.instanceof(EcRollupRule);
            expect(failure.called).to.be.false;
            EcRepository.searchAs.restore();
            done();
        });
    });

    describe('setName', function () {
        it('should set the name of the rollup rule', function () {
            const rule = new EcRollupRule();
            const name = 'Test Name';

            rule.setName(name);

            expect(rule.name).to.equal(name);
        });
    });

    describe('setDescription', function () {
        it('should set the description of the rollup rule', function () {
            const rule = new EcRollupRule();
            const description = 'Test Description';

            rule.setDescription(description);

            expect(rule.description).to.equal(description);
        });
    });

});