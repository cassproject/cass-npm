const chai = require('chai');
const sinon = require('sinon');
const EcCompetency = require('../org/cass/competency/EcCompetency');
const EcRepository = require('../org/cassproject/ebac/repository/EcRepository');
const EcAlignment = require('../org/cass/competency/EcAlignment');
const EcRollupRule = require('../org/cass/competency/EcRollupRule');
const EcLevel = require('../org/cass/competency/EcLevel');
const EcPpk = require('../com/eduworks/ec/crypto/EcPpk');

const expect = chai.expect;

describe('EcCompetency', async function () {
    let competency;

    const repo = new EcRepository();
    await repo.init(process.env.CASS_LOOPBACK || "http://localhost/api/");

    beforeEach(function () {
        competency = new EcCompetency();
    });

    it('should initialize with template values', function () {
        EcCompetency.template = { '@name': 'Test Competency' };
        competency = new EcCompetency();
        expect(competency.name).to.equal('Test Competency');
    });

    it('should check equality based on id', function () {
        competency.id = 'testId';
        const obj = { id: 'testId' };
        expect(competency.equals(obj)).to.be.true;
    });

    it('should retrieve competency asynchronously', function (done) {
        const stub = sinon.stub(EcRepository, 'getAs').callsFake((id, obj, success) => {
            success(obj);
        });

        EcCompetency.get('testId', function (result) {
            expect(result).to.be.instanceOf(EcCompetency);
            stub.restore();
            done();
        }, done);
    });

    it('should retrieve competency synchronously', function () {
        const stub = sinon.stub(EcRepository, 'getAs').returns(new EcCompetency());

        const result = EcCompetency.getBlocking('testId');
        expect(result).to.be.instanceOf(EcCompetency);
        stub.restore();
    });

    it('should search for competencies', function (done) {
        const stub = sinon.stub(EcRepository, 'searchAs').callsFake((repo, query, factory, success) => {
            success([new EcCompetency()]);
        });

        EcCompetency.search(null, 'query', function (results) {
            expect(results).to.be.an('array').that.is.not.empty;
            stub.restore();
            done();
        }, done);
    });

    it('should add an alignment', async function () {
        const stub = sinon.stub(EcAlignment.prototype, 'save').resolves();
        const target = new EcCompetency();
        const owner = EcPpk.generateKey();

        const alignment = await competency.addAlignment(target, 'alignmentType', owner);
        expect(alignment).to.be.instanceOf(EcAlignment);
        stub.restore();
    });

    it('should search for relationships', function (done) {
        const stub = sinon.stub(EcAlignment, 'search').callsFake((repo, query, success) => {
            success([new EcAlignment()]);
        });

        competency.relations(null, function (result) {
            expect(result).to.be.instanceOf(EcAlignment);
            stub.restore();
            done();
        }, done);
    });

    it('should add a level', async function () {
        const stub = sinon.stub(EcLevel.prototype, 'save').resolves();
        const owner = EcPpk.generateKey();

        const level = await competency.addLevel('name', 'description', owner,null,null,repo);
        expect(level).to.be.instanceOf(EcLevel);
        stub.restore();
    });

    it('should search for levels', function (done) {
        const stub = sinon.stub(EcLevel, 'search').callsFake((repo, query, success) => {
            success([new EcLevel()]);
        });

        competency.levels(null, function (result) {
            expect(result).to.be.instanceOf(EcLevel);
            stub.restore();
            done();
        }, done);
    });

    it('should add a rollup rule', async function () {
        const stub = sinon.stub(EcRollupRule.prototype, 'save').resolves();
        const owner = EcPpk.generateKey();

        const rollupRule = await competency.addRollupRule('name', 'description', owner,null,null,repo);
        expect(rollupRule).to.be.instanceOf(EcRollupRule);
        stub.restore();
    });

    it('should search for rollup rules', function (done) {
        const stub = sinon.stub(EcRollupRule, 'search').callsFake((repo, query, success) => {
            success([new EcRollupRule()]);
        });

        competency.rollupRules(null, function (result) {
            expect(result).to.be.instanceOf(EcRollupRule);
            stub.restore();
            done();
        }, done);
    });

    it('should set scope', function () {
        competency.setScope('testScope');
        expect(competency.scope).to.equal('testScope');
    });

    it('should save competency', function (done) {
        const stub = sinon.stub(EcRepository, 'save').callsFake((obj, success) => {
            success();
        });

        competency.name = 'testName';
        competency.save(function () {
            stub.restore();
            expect(competency.name).to.equal('testName');
            done();
        }, done);
    });

});