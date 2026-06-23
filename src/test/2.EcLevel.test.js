const chai = require('chai');
const sinon = require('sinon');
const EcRepository = require('../org/cassproject/ebac/repository/EcRepository');
const EcLevel = require('../org/cass/competency/EcLevel');
const EcAlignment = require('../org/cass/competency/EcAlignment');
const EcPpk = require('../com/eduworks/ec/crypto/EcPpk');
const EcIdentityManager = require('../org/cassproject/ebac/identity/EcIdentityManager');

const { expect } = chai;

describe('EcLevel', () => {
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