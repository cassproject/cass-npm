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
});