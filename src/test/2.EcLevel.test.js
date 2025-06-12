const chai = require('chai');
const sinon = require('sinon');
const EcRepository = require('../org/cassproject/ebac/repository/EcRepository');
const EcLevel = require('../org/cass/competency/EcLevel');
const EcAlignment = require('../org/cass/competency/EcAlignment');
const EcPpk = require('../com/eduworks/ec/crypto/EcPpk');
const EcIdentityManager = require('../org/cassproject/ebac/identity/EcIdentityManager');

const { expect } = chai;

describe('EcLevel', () => {
    let sandbox;

    beforeEach(() => {
        sandbox = sinon.createSandbox();
    });

    afterEach(() => {
        sandbox.restore();
    });

    describe('get', () => {
        it('should retrieve a level by ID', (done) => {
            const id = 'testId';
            const success = sinon.spy();
            const failure = sinon.spy();
            const repo = {};
            const eim = {};

            sandbox.stub(EcRepository, 'getAs').callsFake((id, level, successCallback, failureCallback, repo, eim) => {
                successCallback(level);
            });

            EcLevel.get(id, success, failure, repo, eim);

            expect(success.calledOnce).to.be.true;
            expect(failure.called).to.be.false;
            done();
        });
    });

    describe('getBlocking', () => {
        it('should retrieve a level by ID synchronously', () => {
            const id = 'testId';
            const repo = {};
            const eim = {};

            sandbox.stub(EcRepository, 'getAs').returns(new EcLevel());

            const result = EcLevel.getBlocking(id, repo, eim);

            expect(result).to.be.instanceOf(EcLevel);
        });
    });

    describe('search', () => {
        it('should search for levels with a query', (done) => {
            const repo = {};
            const query = 'testQuery';
            const success = sinon.spy();
            const failure = sinon.spy();
            const paramObj = {};
            const eim = {};

            sandbox.stub(EcRepository, 'searchAs').callsFake((repo, query, levelFactory, successCallback, failureCallback, paramObj, eim) => {
                successCallback([new EcLevel()]);
            });

            EcLevel.search(repo, query, success, failure, paramObj, eim);

            expect(success.calledOnce).to.be.true;
            expect(failure.called).to.be.false;
            done();
        });
    });

    describe('searchByCompetency', () => {
        it('should search for levels by competency ID', (done) => {
            const repo = {};
            const competencyId = 'testCompetencyId';
            const success = sinon.spy();
            const failure = sinon.spy();
            const paramObj = {};
            const eim = {};

            sandbox.stub(EcLevel, 'search').callsFake((repo, query, successCallback, failureCallback, paramObj, eim) => {
                successCallback([new EcLevel()]);
            });

            EcLevel.searchByCompetency(repo, competencyId, success, failure, paramObj, eim);

            expect(success.calledOnce).to.be.true;
            expect(failure.called).to.be.false;
            done();
        });

        it('should call failure callback if no competency ID is provided', () => {
            const repo = {};
            const competencyId = '';
            const success = sinon.spy();
            const failure = sinon.spy();
            const paramObj = {};
            const eim = {};

            EcLevel.searchByCompetency(repo, competencyId, success, failure, paramObj, eim);

            expect(failure.calledOnce).to.be.true;
            expect(success.called).to.be.false;
        });
    });

    describe('addRelationship', () => {
        it('should add a relationship between levels', async () => {
            const level = new EcLevel();
            level.id = 'sourceId';
            const targetLevel = new EcLevel();
            targetLevel.id = 'targetId';
            const alignmentType = 'testType';
            const identity = EcPpk.generateKey();
            const success = sinon.spy();
            const failure = sinon.spy();
            const repo = new EcRepository();
            await repo.init(process.env.CASS_LOOPBACK || 'http://localhost/api/');
            const eim = EcIdentityManager.default;

            let a = await level.addRelationship(targetLevel, alignmentType, identity, success, failure, repo, eim);

            expect(a.source).to.equal(level.id);
            expect(a.target).to.equal(targetLevel.id);
            expect(a.relationType).to.equal(alignmentType);
        });
    });

    describe('setName', () => {
        it('should set the name of the level', () => {
            const level = new EcLevel();
            const name = 'testName';

            level.setName(name);

            expect(level.name).to.equal(name);
        });
    });

    describe('setDescription', () => {
        it('should set the description of the level', () => {
            const level = new EcLevel();
            const description = 'testDescription';

            level.setDescription(description);

            expect(level.description).to.equal(description);
        });
    });

});