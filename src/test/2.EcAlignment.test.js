const chai = require('chai');
const sinon = require('sinon');
const EcAlignment = require('../org/cass/competency/EcAlignment');
const EcRepository = require('../org/cassproject/ebac/repository/EcRepository');

const expect = chai.expect;

describe('EcAlignment', function () {
    describe('equals', function () {
        it('should return true if obj has same source, target, and relationType', function () {
            const alignment1 = new EcAlignment();
            alignment1.source = 'source1';
            alignment1.target = 'target1';
            alignment1.relationType = 'relationType1';

            const alignment2 = {
                source: 'source1',
                target: 'target1',
                relationType: 'relationType1'
            };

            expect(alignment1.equals(alignment2)).to.be.true;
        });

        it('should return false if obj has different source, target, or relationType', function () {
            const alignment1 = new EcAlignment();
            alignment1.source = 'source1';
            alignment1.target = 'target1';
            alignment1.relationType = 'relationType1';

            const alignment2 = {
                source: 'source2',
                target: 'target1',
                relationType: 'relationType1'
            };

            expect(alignment1.equals(alignment2)).to.be.false;
        });

        it('should return true if obj has same id', function () {
            const alignment1 = new EcAlignment();
            alignment1.id = 'id1';

            const alignment2 = {
                id: 'id1'
            };

            expect(alignment1.equals(alignment2)).to.be.true;
        });
    });

    describe('get', function () {
        it('should call EcRepository.getAs with correct parameters', function () {
            const stub = sinon.stub(EcRepository, 'getAs');
            const id = 'id1';
            const success = sinon.spy();
            const failure = sinon.spy();
            const repo = {};
            const eim = {};

            EcAlignment.get(id, success, failure, repo, eim);

            expect(stub.calledOnce).to.be.true;
            expect(stub.calledWith(id, sinon.match.instanceOf(EcAlignment), success, failure, repo, eim)).to.be.true;

            stub.restore();
        });
    });

    describe('getBlocking', function () {
        it('should call EcRepository.getAs with correct parameters', function () {
            const stub = sinon.stub(EcRepository, 'getAs');
            const id = 'id1';
            const repo = {};
            const eim = {};

            EcAlignment.getBlocking(id, repo, eim);

            expect(stub.calledOnce).to.be.true;
            expect(stub.calledWith(id, sinon.match.instanceOf(EcAlignment), null, null, repo, eim)).to.be.true;

            stub.restore();
        });
    });

    describe('search', function () {
        it('should call EcRepository.searchAs with correct parameters', function () {
            const stub = sinon.stub(EcRepository, 'searchAs');
            const repo = {};
            const query = 'query';
            const success = sinon.spy();
            const failure = sinon.spy();
            const paramObj = {};
            const eim = {};

            EcAlignment.search(repo, query, success, failure, paramObj, eim);

            expect(stub.calledOnce).to.be.true;
            expect(stub.calledWith(repo, query, sinon.match.func, success, failure, paramObj, eim)).to.be.true;

            stub.restore();
        });
    });

    describe('searchBySource', function () {
        it('should call EcAlignment.search with correct query', function () {
            const stub = sinon.stub(EcAlignment, 'search');
            const repo = {};
            const sourceId = 'sourceId';
            const success = sinon.spy();
            const failure = sinon.spy();
            const paramObj = {};
            const eim = {};

            EcAlignment.searchBySource(repo, sourceId, success, failure, paramObj, eim);

            const expectedQuery = 'source:"sourceId"';
            expect(stub.calledOnce).to.be.true;
            expect(stub.calledWith(repo, expectedQuery, success, failure, paramObj, eim)).to.be.true;

            stub.restore();
        });
    });

    describe('searchBySources', function () {
        it('should call EcAlignment.search with correct query', function () {
            const stub = sinon.stub(EcAlignment, 'search');
            const repo = {};
            const sourceIds = ['sourceId1', 'sourceId2'];
            const success = sinon.spy();
            const failure = sinon.spy();
            const paramObj = {};
            const eim = {};

            EcAlignment.searchBySources(repo, sourceIds, success, failure, paramObj, eim);

            const expectedQuery = '(source:"sourceId1" OR source:"sourceId2")';
            expect(stub.calledOnce).to.be.true;
            console.log(stub.returnsThis());
            expect(stub.calledWith(repo)).to.be.true;

            stub.restore();
        });
    });

    describe('searchByCompetency', function () {
        it('should call EcAlignment.search with correct query', function () {
            const stub = sinon.stub(EcAlignment, 'search');
            const repo = {};
            const competencyId = 'competencyId';
            const success = sinon.spy();
            const failure = sinon.spy();
            const paramObj = {};
            const eim = {};

            EcAlignment.searchByCompetency(repo, competencyId, success, failure, paramObj, eim);

            const expectedQuery = ' AND (source:"competencyId" OR target:"competencyId")';
            expect(stub.calledOnce).to.be.true;
            expect(stub.calledWith(repo, expectedQuery, success, failure, paramObj, eim)).to.be.true;

            stub.restore();
        });
    });

    describe('save', function () {
        it('should throw error if source is missing', function () {
            const alignment = new EcAlignment();
            alignment.target = 'target';
            alignment.relationType = 'relationType';

            expect(() => alignment.save()).to.throw('Source Competency cannot be missing');
        });

        it('should throw error if target is missing', function () {
            const alignment = new EcAlignment();
            alignment.source = 'source';
            alignment.relationType = 'relationType';

            expect(() => alignment.save()).to.throw('Target Competency cannot be missing');
        });

        it('should throw error if relationType is missing', function () {
            const alignment = new EcAlignment();
            alignment.source = 'source';
            alignment.target = 'target';

            expect(() => alignment.save()).to.throw('Relation Type cannot be missing');
        });

        it('should call EcRepository.save if repo is null', function () {
            const stub = sinon.stub(EcRepository, 'save');
            const alignment = new EcAlignment();
            alignment.source = 'source';
            alignment.target = 'target';
            alignment.relationType = 'relationType';
            const success = sinon.spy();
            const failure = sinon.spy();
            const eim = {};

            alignment.save(success, failure, null, eim);

            expect(stub.calledOnce).to.be.true;
            expect(stub.calledWith(alignment, success, failure, null, eim)).to.be.true;

            stub.restore();
        });

        it('should call repo.saveTo if repo is not null', function () {
            const repo = {
                saveTo: sinon.spy()
            };
            const alignment = new EcAlignment();
            alignment.source = 'source';
            alignment.target = 'target';
            alignment.relationType = 'relationType';
            const success = sinon.spy();
            const failure = sinon.spy();
            const eim = {};

            alignment.save(success, failure, repo, eim);

            expect(repo.saveTo.calledOnce).to.be.true;
            expect(repo.saveTo.calledWith(alignment, success, failure, eim)).to.be.true;
        });
    });

    describe('_delete', function () {
        it('should call EcRepository.DELETE with correct parameters', function () {
            const stub = sinon.stub(EcRepository, 'DELETE');
            const alignment = new EcAlignment();
            const success = sinon.spy();
            const failure = sinon.spy();
            const repo = {};
            const eim = {};

            alignment._delete(success, failure, repo, eim);

            expect(stub.calledOnce).to.be.true;
            expect(stub.calledWith(alignment, success, failure, repo, eim)).to.be.true;

            stub.restore();
        });
    });
});