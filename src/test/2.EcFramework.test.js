const chai = require('chai');
const sinon = require('sinon');
const EcFramework = require('../org/cass/competency/EcFramework');
const EcRepository = require('../org/cassproject/ebac/repository/EcRepository');
const expect = chai.expect;

describe('EcFramework', function () {
    let framework;

    beforeEach(function () {
        framework = new EcFramework();
    });

    it('should initialize with template values if template is set', function () {
        EcFramework.template = { "@name": "Test Framework" };
        framework = new EcFramework();
        expect(framework.name).to.equal("Test Framework");
    });

    it('should return true if IDs match in equals method', function () {
        framework.id = "testId";
        const obj = { id: "testId" };
        expect(framework.equals(obj)).to.be.true;
    });

    it('should add competency if not already present', function () {
        const competencyId = "testCompetency";
        framework.addCompetency(competencyId);
        expect(framework.competency).to.include(competencyId);
    });

    it('should not add duplicate competency', function () {
        const competencyId = "testCompetency";
        framework.addCompetency(competencyId);
        framework.addCompetency(competencyId);
        expect(framework.competency.length).to.equal(1);
    });

    it('should remove competency and associated relations and levels', function (done) {
        const competencyId = "testCompetency";
        framework.competency = [competencyId];
        framework.relation = ["relation1"];
        framework.level = ["level1"];

        sinon.stub(framework, 'removeRelationshipsThatInclude').callsFake((id, i, success) => success());
        sinon.stub(framework, 'removeLevelsThatInclude').callsFake((id, i, success) => success());

        framework.removeCompetency(competencyId, () => {
            expect(framework.competency).to.not.include(competencyId);
            done();
        }, done);
    });

    it('should add relation if not already present', function () {
        const relationId = "testRelation";
        framework.addRelation(relationId);
        expect(framework.relation).to.include(relationId);
    });

    it('should not add duplicate relation', function () {
        const relationId = "testRelation";
        framework.addRelation(relationId);
        framework.addRelation(relationId);
        expect(framework.relation.length).to.equal(1);
    });

    it('should remove relation', function () {
        const relationId = "testRelation";
        framework.relation = [relationId];
        framework.removeRelation(relationId);
        expect(framework.relation).to.not.include(relationId);
    });

    it('should add level if not already present', function () {
        const levelId = "testLevel";
        framework.addLevel(levelId);
        expect(framework.level).to.include(levelId);
    });

    it('should not add duplicate level', function () {
        const levelId = "testLevel";
        framework.addLevel(levelId);
        framework.addLevel(levelId);
        expect(framework.level.length).to.equal(1);
    });

    it('should remove level', function () {
        const levelId = "testLevel";
        framework.level = [levelId];
        framework.removeLevel(levelId);
        expect(framework.level).to.not.include(levelId);
    });

    it('should add rollup rule if not already present', function () {
        const rollupRuleId = "testRollupRule";
        framework.addRollupRule(rollupRuleId);
        expect(framework.rollupRule).to.include(rollupRuleId);
    });

    it('should not add duplicate rollup rule', function () {
        const rollupRuleId = "testRollupRule";
        framework.addRollupRule(rollupRuleId);
        framework.addRollupRule(rollupRuleId);
        expect(framework.rollupRule.length).to.equal(1);
    });

    it('should remove rollup rule', function () {
        const rollupRuleId = "testRollupRule";
        framework.rollupRule = [rollupRuleId];
        framework.removeRollupRule(rollupRuleId);
        expect(framework.rollupRule).to.not.include(rollupRuleId);
    });

    it('should save framework if name is not empty', function (done) {
        framework.name = "Test Framework";
        const stub = sinon.stub(EcRepository, 'save').callsFake((obj, success) => success());
        framework.save(() => {
            expect(EcRepository.save.calledOnce).to.be.true;
            stub.restore();
            done();
        }, done);
    });

    it('should not save framework if name is empty', function () {
        framework.name = "";
        expect(() => framework.save()).to.throw("Framework Name Cannot be Empty");
    });

    it('should delete framework', function (done) {
        const stub = sinon.stub(EcRepository, 'DELETE').callsFake((obj, success) => success());
        framework._delete(() => {
            expect(EcRepository.DELETE.calledOnce).to.be.true;
            stub.restore();
            done();
        }, done);
    });
});