const EcPk = require("../com/eduworks/ec/crypto/EcPk.js");
const EcPpk = require("../com/eduworks/ec/crypto/EcPpk.js");
const EcAes = require("../com/eduworks/ec/crypto/EcAes.js");
let chai = require("chai");
const fs = require('fs');
const EcRsaOaepAsyncWorker = require("../com/eduworks/ec/crypto/EcRsaOaepAsyncWorker");
const EcRepository = require("../org/cassproject/ebac/repository/EcRepository");
const EcAssertion = require("../org/cass/profile/EcAssertion");
const EcIdentityManager = require("../org/cassproject/ebac/identity/EcIdentityManager");
const EcCompetency = require("../org/cass/competency/EcCompetency");
const EcRollupRule = require("../org/cass/competency/EcRollupRule");
const EcAlignment = require("../org/cass/competency/EcAlignment");
const EcFramework = require("../org/cass/competency/EcFramework");
const EcIdentity = require("../org/cassproject/ebac/identity/EcIdentity");
const EcFrameworkGraph = require("../com/eduworks/ec/graph/EcFrameworkGraph");
const EcEncryptedValue = require("../org/cassproject/ebac/repository/EcEncryptedValue.js");
const Assertion = require("../org/cassproject/schema/cass/profile/Assertion.js");
const EcAesCtrAsyncWorker = require("../com/eduworks/ec/crypto/EcAesCtrAsyncWorker.js");

let hrtime = function () {
    try {
        return [Math.round(performance.now() / 1000), performance.now() * 1000];
    } catch {
        try {
            if (typeof process !== 'undefined')
                return process.hrtime();
            return [new Date().getTime(), new Date().getTime() * 1000];
        }
        catch (ex) {
            return [new Date().getTime(), new Date().getTime() * 1000];
        }
    }
};

let should = chai.should();
let expect = chai.expect;
let assert = chai.assert;

after(()=>EcRsaOaepAsyncWorker.teardown());

let deleteById = async function (id) {
    let p1 = await EcRepository.get(id);
    if (p1 != null)
        await EcRepository._delete(p1);
};
let failure = function (p1) {
    console.trace(p1);
    assert.fail();
};

if (fs.readFileSync != null) {
    process.env['NODE_TLS_REJECT_UNAUTHORIZED'] = 0;
}

let repo = new EcRepository();
repo.selectedServer = process.env.CASS_LOOPBACK || "http://localhost/api/";
repo.selectedServerProxy = process.env.CASS_LOOPBACK_PROXY || null;
async function newAssertion(competencyToAssert) {
    let a = new EcAssertion();
    a.generateId(repo.selectedServer);
    await a.addOwner(EcIdentityManager.default.ids[0].ppk.toPk());
    assert.equal(a.owner[0], EcIdentityManager.default.ids[0].ppk.toPk().toPem())
    await a.addReader(EcIdentityManager.default.ids[1].ppk.toPk());
    assert.equal(a.reader[0], EcIdentityManager.default.ids[1].ppk.toPk().toPem())
    await a.setSubject(EcIdentityManager.default.ids[0].ppk.toPk());
    assert.equal((await a.getSubject()).toPem(), EcIdentityManager.default.ids[0].ppk.toPk().toPem());
    await a.setAgent(EcIdentityManager.default.ids[0].ppk.toPk());
    assert.equal((await a.getAgent()).toPem(), EcIdentityManager.default.ids[0].ppk.toPk().toPem());
    a.setCompetency(competencyToAssert.shortId());
    a.setConfidence(1.0);
    let date = new Date().getTime();
    await a.setAssertionDate(date);
    assert.equal(await a.getAssertionDate(), date);
    await a.setExpirationDate(date + 1000 * 60 * 60);
    assert.equal(await a.getExpirationDate(), date + 1000 * 60 * 60);
    await a.setDecayFunction("t");
    assert.equal(await a.getDecayFunction(), "t");
    await a.save(null, failure, repo);
    return a;
}
async function newFalseAssertion(competencyToAssert) {
    let a = new EcAssertion();
    a.generateId(repo.selectedServer);
    await a.addOwner(EcIdentityManager.default.ids[0].ppk.toPk());
    await a.addReader(EcIdentityManager.default.ids[1].ppk.toPk());
    await a.setSubject(EcIdentityManager.default.ids[0].ppk.toPk());
    await a.setAgent(EcIdentityManager.default.ids[0].ppk.toPk());
    a.setCompetency(competencyToAssert.shortId());
    a.setConfidence(1.0);
    await a.setNegative(true);
    await a.setAssertionDate(new Date().getTime());
    await a.setExpirationDate(new Date().getTime() + 1000 * 60 * 60);
    await a.setDecayFunction("t");
    await a.save(null, failure, repo);
    return a;
}
async function newCompetency(competencyName) {
    let competency = new EcCompetency();
    competency.addOwner(EcIdentityManager.default.ids[0].ppk.toPk());
    competency.name = competencyName;
    competency.generateId(repo.selectedServer);
    await competency.save(null, failure, repo);
    return competency;
}
async function newRollupRule(competency, rule) {
    let rr = new EcRollupRule();
    rr.competency = competency.shortId();
    rr.rule = rule;
    rr.addOwner(EcIdentityManager.default.ids[0].ppk.toPk());
    rr.generateId(repo.selectedServer);
    await rr.save(null, failure, repo);
    return rr;
}
async function newRelation(c, c2, relationType) {
    let r = new EcAlignment();
    r.addOwner(EcIdentityManager.default.ids[0].ppk.toPk());
    r.generateId(repo.selectedServer);
    r.relationType = relationType;
    r.source = c.shortId();
    r.target = c2.shortId();
    await r.save(null, failure, repo);
    return r;
}
async function newFramework(frameworkName) {
    let framework = new EcFramework();
    framework.name = frameworkName;
    framework.addOwner(EcIdentityManager.default.ids[0].ppk.toPk());
    framework.generateId(repo.selectedServer);
    await framework.save(null, failure, repo);
    return framework;
}

describe("EcFrameworkGraph", () => {
    it('init', async () => {
        let newId1, newId2;
        EcIdentityManager.default.clearIdentities();
        if ((typeof Cypress !== 'undefined') && Cypress?.env != null)
            process.env.CASS_LOOPBACK = Cypress.env('CASS_LOOPBACK');
        console.log(process.env.CASS_LOOPBACK);
        await repo.init(process.env.CASS_LOOPBACK || "http://localhost/api/", null, null, console.log);
        newId1 = null;
        if (EcIdentityManager.default.ids.length <= 0) {
            newId1 = new EcIdentity();
            newId1.ppk = EcPpk.fromPem(
                "-----BEGIN RSA PRIVATE KEY-----MIIEpAIBAAKCAQEAz4BiFucFE9bNcKfGD+e6aPRHl402YM4Z6nrurDRNlnwsWpsCoZasPLkjC314pVtHAI2duZo+esGKDloBsiLxASRJo3R2XiXVh2Y8U1RcHA5mWL4tMG5UY2d0libpNEHbHPNBmooVYpA2yhxN/vGibIk8x69uZWxJcFOxOg6zWG8EjF8UMgGnRCVSMTY3THhTlfZ0cGUzvrfb7OvHUgdCe285XkmYkj/V9P/m7hbWoOyJAJSTOm4/s6fIKpl72lblfN7bKaxTCsJp6/rQdmUeo+PIaa2lDOfo7dWbuTMcqkZ93kispNfYYhsEGUGlCsrrVWhlve8MenO4GdLsFP+HRwIDAQABAoIBAGaQpOuBIYde44lNxJ7UAdYi+Mg2aqyK81Btl0/TQo6hriLTAAfzPAt/z4y8ZkgFyCDD3zSAw2VWCPFzF+d/UfUohKWgyWlb9iHJLQRbbHQJwhkXV6raviesWXpmnVrROocizkie/FcNxac9OmhL8+cGJt7lHgJP9jTpiW6TGZ8ZzM8KBH2l80x9AWdvCjsICuPIZRjc706HtkKZzTROtq6Z/F4Gm0uWRnwAZrHTRpnh8qjtdBLYFrdDcUoFtzOM6UVRmocTfsNe4ntPpvwY2aGTWY7EmTj1kteMJ+fCQFIS+KjyMWQHsN8yQNfD5/j2uv6/BdSkO8uorGSJT6DwmTECgYEA8ydoQ4i58+A1udqA+fujM0Zn46++NTehFe75nqIt8rfQgoduBam3lE5IWj2U2tLQeWxQyr1ZJkLbITtrAI3PgfMnuFAii+cncwFo805Fss/nbKx8K49vBuCEAq3MRhLjWy3ZvIgUHj67jWvl50dbNqc7TUguxhS4BxGr/cPPkP0CgYEA2nbJPGzSKhHTETL37NWIUAdU9q/6NVRISRRXeRqZYwE1VPzs2sIUxA8zEDBHX7OtvCKzvZy1Lg5Unx1nh4nCEVkbW/8npLlRG2jOcZJF6NRfhzwLz3WMIrP6j9SmjJaB+1mnrTjfsg36tDEPDjjJLjJHCx9z/qRJh1v4bh4aPpMCgYACG31T2IOEEZVlnvcvM3ceoqWT25oSbAEBZ6jSLyWmzOEJwJK7idUFfAg0gAQiQWF9K+snVqzHIB02FIXA43nA7pKRjmA+RiqZXJHEShFgk1y2HGiXGA8mSBvcyhTTJqbBy4vvjl5eRLzrZNwBPSUVPC3PZajCHrvZk9WhxWivIQKBgQCzCu1MH2dy4R7ZlqsIJ8zKweeJMZpfQI7pjclO0FTrhh7+Yzd+5db9A/P2jYrBTVHSwaILgTYf49DIguHJfEZXz26TzB7iapqlWxTukVHISt1ryPNo+E58VoLAhChnSiaHJ+g7GESE+d4A9cAACNwgh0YgQIvhIyW70M1e+j7KDwKBgQDQSBLFDFmvvTP3sIRAr1+0OZWd1eRcwdhs0U9GwootoCoUP/1Y64pqukT6B9oIB/No9Nyn8kUX3/ZDtCslaGKEUGMJXQ4hc5J+lq0tSi9ZWBdhqOuMPEfUF3IxW+9yeILP4ppUBn1m5MVOWg5CvuuEeCmy4bhMaUErUlHZ78t5cA==-----END RSA PRIVATE KEY-----"
            );
            newId2 = new EcIdentity();
            newId2.ppk = EcPpk.generateKey();
            EcIdentityManager.default.ids = [];
            EcIdentityManager.default.addIdentity(newId1);
            EcIdentityManager.default.addIdentity(newId2);
        }
        assert.notEqual(EcIdentityManager.default.ids.length, 0);
    });
    it('encryption then decryption', async () => {
        let randomString = EcAes.newIv(256).substring(0, 190);
        let ppk = EcPpk.fromPem(
            "-----BEGIN RSA PRIVATE KEY-----MIIEpAIBAAKCAQEAz4BiFucFE9bNcKfGD+e6aPRHl402YM4Z6nrurDRNlnwsWpsCoZasPLkjC314pVtHAI2duZo+esGKDloBsiLxASRJo3R2XiXVh2Y8U1RcHA5mWL4tMG5UY2d0libpNEHbHPNBmooVYpA2yhxN/vGibIk8x69uZWxJcFOxOg6zWG8EjF8UMgGnRCVSMTY3THhTlfZ0cGUzvrfb7OvHUgdCe285XkmYkj/V9P/m7hbWoOyJAJSTOm4/s6fIKpl72lblfN7bKaxTCsJp6/rQdmUeo+PIaa2lDOfo7dWbuTMcqkZ93kispNfYYhsEGUGlCsrrVWhlve8MenO4GdLsFP+HRwIDAQABAoIBAGaQpOuBIYde44lNxJ7UAdYi+Mg2aqyK81Btl0/TQo6hriLTAAfzPAt/z4y8ZkgFyCDD3zSAw2VWCPFzF+d/UfUohKWgyWlb9iHJLQRbbHQJwhkXV6raviesWXpmnVrROocizkie/FcNxac9OmhL8+cGJt7lHgJP9jTpiW6TGZ8ZzM8KBH2l80x9AWdvCjsICuPIZRjc706HtkKZzTROtq6Z/F4Gm0uWRnwAZrHTRpnh8qjtdBLYFrdDcUoFtzOM6UVRmocTfsNe4ntPpvwY2aGTWY7EmTj1kteMJ+fCQFIS+KjyMWQHsN8yQNfD5/j2uv6/BdSkO8uorGSJT6DwmTECgYEA8ydoQ4i58+A1udqA+fujM0Zn46++NTehFe75nqIt8rfQgoduBam3lE5IWj2U2tLQeWxQyr1ZJkLbITtrAI3PgfMnuFAii+cncwFo805Fss/nbKx8K49vBuCEAq3MRhLjWy3ZvIgUHj67jWvl50dbNqc7TUguxhS4BxGr/cPPkP0CgYEA2nbJPGzSKhHTETL37NWIUAdU9q/6NVRISRRXeRqZYwE1VPzs2sIUxA8zEDBHX7OtvCKzvZy1Lg5Unx1nh4nCEVkbW/8npLlRG2jOcZJF6NRfhzwLz3WMIrP6j9SmjJaB+1mnrTjfsg36tDEPDjjJLjJHCx9z/qRJh1v4bh4aPpMCgYACG31T2IOEEZVlnvcvM3ceoqWT25oSbAEBZ6jSLyWmzOEJwJK7idUFfAg0gAQiQWF9K+snVqzHIB02FIXA43nA7pKRjmA+RiqZXJHEShFgk1y2HGiXGA8mSBvcyhTTJqbBy4vvjl5eRLzrZNwBPSUVPC3PZajCHrvZk9WhxWivIQKBgQCzCu1MH2dy4R7ZlqsIJ8zKweeJMZpfQI7pjclO0FTrhh7+Yzd+5db9A/P2jYrBTVHSwaILgTYf49DIguHJfEZXz26TzB7iapqlWxTukVHISt1ryPNo+E58VoLAhChnSiaHJ+g7GESE+d4A9cAACNwgh0YgQIvhIyW70M1e+j7KDwKBgQDQSBLFDFmvvTP3sIRAr1+0OZWd1eRcwdhs0U9GwootoCoUP/1Y64pqukT6B9oIB/No9Nyn8kUX3/ZDtCslaGKEUGMJXQ4hc5J+lq0tSi9ZWBdhqOuMPEfUF3IxW+9yeILP4ppUBn1m5MVOWg5CvuuEeCmy4bhMaUErUlHZ78t5cA==-----END RSA PRIVATE KEY-----"
        );
        let pk = ppk.toPk();
        let encrypted = await EcRsaOaepAsyncWorker.encrypt(pk, randomString);
        let decrypted = await EcRsaOaepAsyncWorker.decrypt(ppk, encrypted);
        assert.isTrue(randomString == decrypted);
    })
    it('basic true test', async () => {
        let f = await newFramework("basic true framework");
        let c = await newCompetency("Add");
        f.addCompetency(c.shortId());
        await f.save(null, failure, repo);
        let a = await newAssertion(c);
        let fg = new EcFrameworkGraph();
        let result = await fg.addFramework(
            f,
            repo,
            () => {},
            () => {}
        ).then(async () => {
            let assertions = [];
            assertions.push(a);
            let result = await fg.processAssertionsBoolean(
                assertions,
                () => {},
                () => {}
            ).then(() => {
                let result = [];
                if (fg.getMetaStateCompetency(c)["positiveAssertion"] != null)
                    result.push(fg.getMetaStateCompetency(c)["positiveAssertion"].length);
                return result;
            }).catch((err) => {
                assert.fail(err);
            });
            return result;
        }).catch((err) => {
            assert.fail(err);
        }).finally(async () => {
            await deleteById(f.shortId());
            await deleteById(c.shortId());
            await deleteById(a.shortId());
        });
        assert.deepEqual(result, [1]);
    })
    it('assertion encrypt decrypt async noCrypto x100', async () => {
        EcRsaOaepAsyncWorker.encryptCounter = 0;
        EcRsaOaepAsyncWorker.decryptCounter = 0;
        EcRsaOaepAsyncWorker.signCounter = 0;
        EcRsaOaepAsyncWorker.verifyCounter = 0;
        EcAesCtrAsyncWorker.encryptCounter = 0;
        EcAesCtrAsyncWorker.decryptCounter = 0;
        let count = 100;
        let promises = [];
        let c = await newCompetency("async test");
        for (let i = 0;i < count;i++)
        {
            promises.push((async ()=>{
                let a = new Assertion();
                a.generateId(repo.selectedServer);
                await a.addOwner(EcIdentityManager.default.ids[0].ppk.toPk());
                assert.equal(a.owner[0], EcIdentityManager.default.ids[0].ppk.toPk().toPem());
                await a.addReader(EcIdentityManager.default.ids[1].ppk.toPk());
                assert.equal(a.reader[0], EcIdentityManager.default.ids[1].ppk.toPk().toPem());
                let date = new Date().getTime();
                await a.setSubject(EcIdentityManager.default.ids[0].ppk.toPk());
                assert.equal((await a.getSubject()).toPem(), EcIdentityManager.default.ids[0].ppk.toPk().toPem());
                await a.getSubjectAsync((subject) => {
                    assert.equal(subject.toPem(), EcIdentityManager.default.ids[0].ppk.toPk().toPem());
                })
                await a.setAgent(EcIdentityManager.default.ids[0].ppk.toPk());
                assert.equal((await a.getAgent()).toPem(), EcIdentityManager.default.ids[0].ppk.toPk().toPem());
                await a.getAgentAsync((agent) => { //NOSONAR This is test code. Cmon man.
                    assert.equal(agent.toPem(), EcIdentityManager.default.ids[0].ppk.toPk().toPem());
                })
                await a.setAssertionDate(date);                
                assert.equal(await a.getAssertionDate(), date);
                await a.getAssertionDateAsync((date2) => {
                    assert.equal(date2, date);
                })
                await a.setExpirationDate(date + 1000 * 60 * 60);                
                assert.equal(await a.getExpirationDate(), date + 1000 * 60 * 60);
                await a.getExpirationDateAsync((date2) => {
                    assert.equal(date2, date + 1000 * 60 * 60);
                })
                await a.setDecayFunction("t");                
                await a.getDecayFunctionAsync((df) => {
                    assert.equal(df, "t");
                });
                assert.equal(await a.getDecayFunction(), "t");
                a.setCompetency(c.shortId());
                a.setConfidence(1.0);
                return a;
            })());
        }
        assert.equal((await Promise.all(promises)).filter(x=>x).length, count);
        assert.equal((await Promise.all((await Promise.all(promises)).map(x=>x.getDecayFunction()))).filter(x=>x).length, count);
        console.log("rsa:",{encryptCounter:EcRsaOaepAsyncWorker.encryptCounter, decryptCounter:EcRsaOaepAsyncWorker.decryptCounter,signCounter:EcRsaOaepAsyncWorker.signCounter, verifyCounter:EcRsaOaepAsyncWorker.verifyCounter});
        console.log("aes:",{encryptCounter:EcAesCtrAsyncWorker.encryptCounter, decryptCounter:EcAesCtrAsyncWorker.decryptCounter});
    });
    it('assertion encrypt decrypt async noSecretCaching x100', async () => {
        let count = 100;
        EcRsaOaepAsyncWorker.encryptCounter = 0;
        EcRsaOaepAsyncWorker.decryptCounter = 0;
        EcRsaOaepAsyncWorker.signCounter = 0;
        EcRsaOaepAsyncWorker.verifyCounter = 0;
        EcAesCtrAsyncWorker.encryptCounter = 0;
        EcAesCtrAsyncWorker.decryptCounter = 0;
        EcEncryptedValue.secretReuse = false;
        EcEncryptedValue.secretReuseMap = {};
        let promises = [];
        let c = await newCompetency("async test");
        for (let i = 0;i < count;i++)
        {
            promises.push((async ()=>{
                let a = new EcAssertion();
                a.generateId(repo.selectedServer);
                await a.addOwner(EcIdentityManager.default.ids[0].ppk.toPk());
                assert.equal(a.owner[0], EcIdentityManager.default.ids[0].ppk.toPk().toPem());
                await a.addReader(EcIdentityManager.default.ids[1].ppk.toPk());
                assert.equal(a.reader[0], EcIdentityManager.default.ids[1].ppk.toPk().toPem());
                let date = new Date().getTime();
                await a.setSubject(EcIdentityManager.default.ids[0].ppk.toPk());
                assert.equal((await a.getSubject()).toPem(), EcIdentityManager.default.ids[0].ppk.toPk().toPem());
                await a.getSubjectAsync((subject) => {
                    assert.equal(subject.toPem(), EcIdentityManager.default.ids[0].ppk.toPk().toPem());
                })
                await a.setAgent(EcIdentityManager.default.ids[0].ppk.toPk());
                assert.equal((await a.getAgent()).toPem(), EcIdentityManager.default.ids[0].ppk.toPk().toPem());
                await a.getAgentAsync((agent) => { //NOSONAR This is test code. Cmon man.
                    assert.equal(agent.toPem(), EcIdentityManager.default.ids[0].ppk.toPk().toPem());
                })
                await a.setAssertionDate(date);                
                assert.equal(await a.getAssertionDate(), date);
                await a.getAssertionDateAsync((date2) => {
                    assert.equal(date2, date);
                })
                await a.setExpirationDate(date + 1000 * 60 * 60);                
                assert.equal(await a.getExpirationDate(), date + 1000 * 60 * 60);
                await a.getExpirationDateAsync((date2) => {
                    assert.equal(date2, date + 1000 * 60 * 60);
                })
                await a.setDecayFunction("t");                
                await a.getDecayFunctionAsync((df) => {
                    assert.equal(df, "t");
                });
                assert.equal(await a.getDecayFunction(), "t");
                a.setCompetency(c.shortId());
                a.setConfidence(1.0);
                return a;
            })());
        }
        assert.equal((await Promise.all(promises)).filter(x=>x).length, count);
        assert.equal((await Promise.all((await Promise.all(promises)).map(x=>x.getDecayFunction()))).filter(x=>x).length, count);
        console.log("rsa:",{encryptCounter:EcRsaOaepAsyncWorker.encryptCounter, decryptCounter:EcRsaOaepAsyncWorker.decryptCounter,signCounter:EcRsaOaepAsyncWorker.signCounter, verifyCounter:EcRsaOaepAsyncWorker.verifyCounter});
        console.log("aes:",{encryptCounter:EcAesCtrAsyncWorker.encryptCounter, decryptCounter:EcAesCtrAsyncWorker.decryptCounter});
        EcEncryptedValue.secretReuse = true;
    });
    it('assertion encrypt decrypt async x100', async () => {
        EcEncryptedValue.secretReuseMap = {};
        EcRsaOaepAsyncWorker.encryptCounter = 0;
        EcRsaOaepAsyncWorker.decryptCounter = 0;
        EcRsaOaepAsyncWorker.signCounter = 0;
        EcRsaOaepAsyncWorker.verifyCounter = 0;
        EcAesCtrAsyncWorker.encryptCounter = 0;
        EcAesCtrAsyncWorker.decryptCounter = 0;
        let count = 100;
        let promises = [];
        let c = await newCompetency("async test");
        for (let i = 0;i < count;i++)
        {
            promises.push((async ()=>{
                let a = new EcAssertion();
                a.generateId(repo.selectedServer);
                await a.addOwner(EcIdentityManager.default.ids[0].ppk.toPk());
                assert.equal(a.owner[0], EcIdentityManager.default.ids[0].ppk.toPk().toPem());
                await a.addReader(EcIdentityManager.default.ids[1].ppk.toPk());
                assert.equal(a.reader[0], EcIdentityManager.default.ids[1].ppk.toPk().toPem());
                let date = new Date().getTime();
                await a.setSubject(EcIdentityManager.default.ids[0].ppk.toPk());
                assert.equal((await a.getSubject()).toPem(), EcIdentityManager.default.ids[0].ppk.toPk().toPem());
                await a.getSubjectAsync((subject) => {
                    assert.equal(subject.toPem(), EcIdentityManager.default.ids[0].ppk.toPk().toPem());
                })
                await a.setAgent(EcIdentityManager.default.ids[0].ppk.toPk());
                assert.equal((await a.getAgent()).toPem(), EcIdentityManager.default.ids[0].ppk.toPk().toPem());
                await a.getAgentAsync((agent) => { //NOSONAR This is test code. Cmon man.
                    assert.equal(agent.toPem(), EcIdentityManager.default.ids[0].ppk.toPk().toPem());
                })
                await a.setAssertionDate(date);                
                assert.equal(await a.getAssertionDate(), date);
                await a.getAssertionDateAsync((date2) => {
                    assert.equal(date2, date);
                })
                await a.setExpirationDate(date + 1000 * 60 * 60);                
                assert.equal(await a.getExpirationDate(), date + 1000 * 60 * 60);
                await a.getExpirationDateAsync((date2) => {
                    assert.equal(date2, date + 1000 * 60 * 60);
                })
                await a.setDecayFunction("t");                
                await a.getDecayFunctionAsync((df) => {
                    assert.equal(df, "t");
                });
                assert.equal(await a.getDecayFunction(), "t");
                a.setCompetency(c.shortId());
                a.setConfidence(1.0);
                return a;
            })());
        }
        assert.equal((await Promise.all(promises)).filter(x=>x).length, count);
        assert.equal((await Promise.all((await Promise.all(promises)).map(x => x.getDecayFunction()))).filter(x => x).length, count);
        console.log("rsa:",{encryptCounter:EcRsaOaepAsyncWorker.encryptCounter, decryptCounter:EcRsaOaepAsyncWorker.decryptCounter,signCounter:EcRsaOaepAsyncWorker.signCounter, verifyCounter:EcRsaOaepAsyncWorker.verifyCounter});
        console.log("aes:",{encryptCounter:EcAesCtrAsyncWorker.encryptCounter, decryptCounter:EcAesCtrAsyncWorker.decryptCounter});
    });
    it('newIv a bunch of times', async()=>{
        let count = 100000;
        let promises = [];
        for (let i = 0;i < count;i++)
        {
            promises.push(EcAes.newIv(16));
        }
        assert.equal((await Promise.all(promises)).filter(x=>x).length, count);
    })
    it('basic false test', async () => {
        let f = await newFramework("basic false framework");
        let c = await newCompetency("Add");
        f.addCompetency(c.shortId());
        await f.save(null, failure, repo);
        let a = await newFalseAssertion(c);
        let fg = new EcFrameworkGraph();
        let result = await fg.addFramework(
            f,
            repo,
            () => {},
            () => {}
        ).then(async () => {
            let assertions = [];
            let assertion = await EcAssertion.get(a.shortId());
            assertions.push(assertion);
            let result = await fg.processAssertionsBoolean(
                assertions,
                () => {},
                () => {}
            ).then(() => {
                let result = [];
                if (fg.getMetaStateCompetency(c)["negativeAssertion"] != null)
                    result.push(fg.getMetaStateCompetency(c)["negativeAssertion"].length);
                return result;
            }).catch((err) => {
                console.trace(err);
                assert.fail(err);
            });
            return result;
        }).catch((err) => {
            console.trace(err);
            assert.fail(err);
        }).finally(async () => {
            await deleteById(f.shortId());
            await deleteById(c.shortId());
            await deleteById(a.shortId());
        });
        assert.deepEqual(result, [1]);
    })
    it('basic indeterminant test', async () => {
        let f = await newFramework("basic indeterminant framework");
        let c = await newCompetency("Add");
        f.addCompetency(c.shortId());
        await f.save(null, failure, repo);
        let a = await newAssertion(c);
        let a2 = await newFalseAssertion(c);
        let fg = new EcFrameworkGraph();
        let result = await fg.addFramework(
            f,
            repo,
            () => {},
            () => {}
        ).then(async () => {
            let assertions = [];
            assertions.push(await EcAssertion.get(a.shortId()));
            assertions.push(await EcAssertion.get(a2.shortId()));
            let result = await fg.processAssertionsBoolean(
                assertions,
                () => {},
                () => {}
            ).then(() => {
                let result = [];
                if (fg.getMetaStateCompetency(c)["positiveAssertion"] != null)
                result.push(fg.getMetaStateCompetency(c)["positiveAssertion"].length);
                if (fg.getMetaStateCompetency(c)["negativeAssertion"] != null)
                result.push(fg.getMetaStateCompetency(c)["negativeAssertion"].length);
                return result;
            }).catch((err) => {
                assert.fail(err);
            });
            return result;
        }).catch((err) => {
            assert.fail(err);
        }).finally(async () => {
            await deleteById(f.shortId());
            await deleteById(c.shortId());
            await deleteById(a.shortId());
            await deleteById(a2.shortId());
        });
        assert.deepEqual(result, [1, 1]);
    })
    it('basic unknown test', async () => {
        let f = await newFramework("basic unknown framework");
        let c = await newCompetency("Add");
        f.addCompetency(c.shortId());
        await f.save(null, failure, repo);
        let fg = new EcFrameworkGraph();
        let result = await fg.addFramework(
            f,
            repo,
            () => {},
            () => {}
        ).then(async () => {
            let assertions = [];
            let result = await fg.processAssertionsBoolean(
                assertions,
                () => {},
                () => {}
            ).then(() => {
                let result = [];
                result.push(fg.getMetaStateCompetency(c)["positiveAssertion"]);
                result.push(fg.getMetaStateCompetency(c)["negativeAssertion"]);
                return result;
            }).catch((err) => {
                assert.fail(err);
            });
            return result;
        }).catch((err) => {
            assert.fail(err);
        }).finally(async () => {
            await deleteById(f.shortId());
            await deleteById(c.shortId());
        });
        assert.deepEqual(result, [undefined, undefined]);
    })
    it('basic equivalence test', async () => {
        let f = await newFramework("basic equivalence framework");
        let c = await newCompetency("Add");
        let c2 = await newCompetency("Sum");
        f.addCompetency(c.shortId());
        f.addCompetency(c2.shortId());
        let r = await newRelation(c, c2, EcAlignment.IS_EQUIVALENT_TO);
        f.addRelation(r.shortId());
        await f.save(null, failure, repo);
        let a = await newAssertion(c2);
        let fg = new EcFrameworkGraph();
        let result = await fg.addFramework(
            f,
            repo,
            () => {},
            () => {}
        ).then(async () => {
            let assertions = [];
            assertions.push(a);
            let result = await fg.processAssertionsBoolean(
                assertions,
                () => {},
                () => {}
            ).then(() => {
                let result = [];
                if (fg.getMetaStateCompetency(c)["positiveAssertion"] != null)
                result.push(fg.getMetaStateCompetency(c)["positiveAssertion"].length);
                if (fg.getMetaStateCompetency(c2)["positiveAssertion"] != null)
                result.push(fg.getMetaStateCompetency(c2)["positiveAssertion"].length);
                return result;
            }).catch((err) => {
                assert.fail(err);
            });
            return result;
        }).catch((err) => {
            assert.fail(err);
        }).finally(async () => {
            await deleteById(f.shortId());
            await deleteById(c.shortId());
            await deleteById(c2.shortId());
            await deleteById(a.shortId());
            await deleteById(r.shortId());
        });
        assert.deepEqual(result, [1, 1]);
    })
    it('basic equivalence false test', async () => {
        let f = await newFramework("basic equivalence false framework");
        let c = await newCompetency("Add");
        let c2 = await newCompetency("Sum");
        f.addCompetency(c.shortId());
        f.addCompetency(c2.shortId());
        let r = await newRelation(c, c2, EcAlignment.IS_EQUIVALENT_TO);
        f.addRelation(r.shortId());
        await f.save(null, failure, repo);
        let a = await newFalseAssertion(c2);
        let fg = new EcFrameworkGraph();
        let result = await fg.addFramework(
            f,
            repo,
            () => {},
            () => {}
        ).then(async () => {
            let assertions = [];
            assertions.push(await EcAssertion.get(a.shortId()));
            let result = await fg.processAssertionsBoolean(
                assertions,
                () => {},
                () => {}
            ).then(() => {
                let result = [];
                if (fg.getMetaStateCompetency(c)["negativeAssertion"] != null)
                result.push(fg.getMetaStateCompetency(c)["negativeAssertion"].length);
                if (fg.getMetaStateCompetency(c2)["negativeAssertion"] != null)
                result.push(fg.getMetaStateCompetency(c2)["negativeAssertion"].length);
                return result;
            }).catch((err) => {
                assert.fail(err);
            });
            return result;
        }).catch((err) => {
            assert.fail(err);
        }).finally(async () => {
            await deleteById(f.shortId());
            await deleteById(c.shortId());
            await deleteById(c2.shortId());
            await deleteById(a.shortId());
            await deleteById(r.shortId());
        });
        assert.deepEqual(result, [1, 1]);
    })
    it('basic equivalence indeterminant test', async () => {
        let f = await newFramework("basic equivalence indeterminant framework");
        let c = await newCompetency("Add");
        let c2 = await newCompetency("Sum");
        f.addCompetency(c.shortId());
        f.addCompetency(c2.shortId());
        let r = await newRelation(c, c2, EcAlignment.IS_EQUIVALENT_TO);
        f.addRelation(r.shortId());
        await f.save(null, failure, repo);
        let a = await newAssertion(c);
        let a2 = await newFalseAssertion(c2);
        let fg = new EcFrameworkGraph();
        let result = await fg.addFramework(
            f,
            repo,
            () => {},
            () => {}
        ).then(async () => {
            let assertions = [];
            assertions.push(await EcAssertion.get(a.shortId()));
            assertions.push(await EcAssertion.get(a2.shortId()));
            let result = await fg.processAssertionsBoolean(
                assertions,
                () => {},
                () => {}
            ).then(() => {
                let result = [];
                if (fg.getMetaStateCompetency(c)["positiveAssertion"] != null)
                result.push(fg.getMetaStateCompetency(c)["positiveAssertion"].length);
                else
                result.push(0);
                if (fg.getMetaStateCompetency(c2)["positiveAssertion"] != null)
                result.push(fg.getMetaStateCompetency(c2)["positiveAssertion"].length);
                else
                result.push(0);
                if (fg.getMetaStateCompetency(c)["negativeAssertion"] != null)
                result.push(fg.getMetaStateCompetency(c)["negativeAssertion"].length);
                else
                result.push(0);
                if (fg.getMetaStateCompetency(c2)["negativeAssertion"] != null)
                result.push(fg.getMetaStateCompetency(c2)["negativeAssertion"].length);
                else
                result.push(0);
                return result;
            }).catch((err) => {
                assert.fail(err);
            });
            return result;
        }).catch((err) => {
            assert.fail(err);
        }).finally(async () => {
            await deleteById(f.shortId());
            await deleteById(c.shortId());
            await deleteById(c2.shortId());
            await deleteById(a.shortId());
            await deleteById(a2.shortId());
            await deleteById(r.shortId());
        });
        assert.deepEqual(result, [1, 1, 1, 1]);
    })
    it('basic equivalence unknown test', async () => {
        let f = await newFramework("basic equivalence unknown framework");
        let c = await newCompetency("Add");
        let c2 = await newCompetency("Sum");
        f.addCompetency(c.shortId());
        f.addCompetency(c2.shortId());
        let r = await newRelation(c, c2, EcAlignment.IS_EQUIVALENT_TO);
        f.addRelation(r.shortId());
        f.save(null, failure, repo);
        let fg = new EcFrameworkGraph();
        let result = await fg.addFramework(
            f,
            repo,
            () => {},
            () => {}
        ).then(async () => {
            let assertions = [];
            let result = await fg.processAssertionsBoolean(
                assertions,
                () => {},
                () => {}
            ).then(() => {
                let result = [];
                result.push(fg.getMetaStateCompetency(c)["positiveAssertion"]);
                result.push(fg.getMetaStateCompetency(c2)["positiveAssertion"]);
                result.push(fg.getMetaStateCompetency(c)["negativeAssertion"]);
                result.push(fg.getMetaStateCompetency(c2)["negativeAssertion"]);
                return result;
            }).catch((err) => {
                assert.fail(err);
            });
            return result;
        }).catch((err) => {
            assert.fail(err);
        }).finally(async () => {
            await deleteById(f.shortId());
            await deleteById(c.shortId());
            await deleteById(c2.shortId());
            await deleteById(r.shortId());
        });
        assert.deepEqual(result, [undefined, undefined, undefined, undefined]);
    })
    it('basic equivalence equivalence test', async () => {
        let f = await newFramework("basic equivalence equivalence framework");
        let c = await newCompetency("Add");
        let c2 = await newCompetency("Sum");
        let c3 = await newCompetency("Amass");
        f.addCompetency(c.shortId());
        f.addCompetency(c2.shortId());
        f.addCompetency(c3.shortId());
        let r = await newRelation(c, c2, EcAlignment.IS_EQUIVALENT_TO);
        let r2 = await newRelation(c2, c3, EcAlignment.IS_EQUIVALENT_TO);
        f.addRelation(r.shortId());
        f.addRelation(r2.shortId());
        await f.save(null, failure, repo);
        let a = await newAssertion(c3);
        let fg = new EcFrameworkGraph();
        let result = await fg.addFramework(
            f,
            repo,
            () => {},
            () => {}
        ).then(async () => {
            let assertions = [];
            assertions.push(a);
            let result = await fg.processAssertionsBoolean(
                assertions,
                () => {},
                () => {}
            ).then(() => {
                let result = [];
                if (fg.getMetaStateCompetency(c)["positiveAssertion"] != null)
                result.push(fg.getMetaStateCompetency(c)["positiveAssertion"].length);
                if (fg.getMetaStateCompetency(c2)["positiveAssertion"] != null)
                result.push(fg.getMetaStateCompetency(c2)["positiveAssertion"].length);
                if (fg.getMetaStateCompetency(c3)["positiveAssertion"] != null)
                result.push(fg.getMetaStateCompetency(c3)["positiveAssertion"].length);
                return result;
            }).catch((err) => {
                assert.fail(err);
            });
            return result;
        }).catch((err) => {
            assert.fail(err);
        }).finally(async () => {
            await deleteById(f.shortId());
            await deleteById(c.shortId());
            await deleteById(c2.shortId());
            await deleteById(c3.shortId());
            await deleteById(a.shortId());
            await deleteById(r.shortId());
            await deleteById(r2.shortId());
        });
        assert.deepEqual(result, [1, 1, 1]);
    })
    it('basic equivalence unequivalent test', async () => {
        let f = await newFramework("basic equivalence unequivalent framework");
        let c = await newCompetency("Add");
        let c2 = await newCompetency("Sum");
        let c3 = await newCompetency("Amass");
        f.addCompetency(c.shortId());
        f.addCompetency(c2.shortId());
        f.addCompetency(c3.shortId());
        let r = await newRelation(c, c2, EcAlignment.IS_EQUIVALENT_TO);
        f.addRelation(r.shortId());
        await f.save(null, failure, repo);
        let a = await newAssertion(c3);
        let fg = new EcFrameworkGraph();
        let result = await fg.addFramework(
            f,
            repo,
            () => {},
            () => {}
        ).then(async () => {
            let assertions = [];
            assertions.push(a);
            let result = await fg.processAssertionsBoolean(
                assertions,
                () => {},
                () => {}
            ).then(() => {
                let result = [];
                result.push(fg.getMetaStateCompetency(c)["positiveAssertion"]);
                result.push(fg.getMetaStateCompetency(c2)["positiveAssertion"]);
                if (fg.getMetaStateCompetency(c3)["positiveAssertion"] != null)
                result.push(fg.getMetaStateCompetency(c3)["positiveAssertion"].length);
                return result;
            }).catch((err) => {
                assert.fail(err);
            });
            return result;
        }).catch((err) => {
            assert.fail(err);
        }).finally(async () => {
            await deleteById(f.shortId());
            await deleteById(c.shortId());
            await deleteById(c2.shortId());
            await deleteById(c3.shortId());
            await deleteById(a.shortId());
            await deleteById(r.shortId());
        });
        assert.deepEqual(result, [undefined, undefined, 1]);
    })
    it('basic requires satisfied test', async () => {
        let f = await newFramework("basic requires satisfied framework");
        let c = await newCompetency("Add");
        let c2 = await newCompetency("Sum");
        f.addCompetency(c.shortId());
        f.addCompetency(c2.shortId());
        let r = await newRelation(c, c2, EcAlignment.REQUIRES);
        f.addRelation(r.shortId());
        await f.save(null, failure, repo);
        let a = await newAssertion(c);
        let fg = new EcFrameworkGraph();
        let result = await fg.addFramework(
            f,
            repo,
            () => {},
            () => {}
        ).then(async () => {
            let assertions = [];
            assertions.push(a);
            let result = await fg.processAssertionsBoolean(
                assertions,
                () => {},
                () => {}
            ).then(() => {
                let result = [];
                if (fg.getMetaStateCompetency(c)["positiveAssertion"] != null)
                result.push(fg.getMetaStateCompetency(c)["positiveAssertion"].length);
                if (fg.getMetaStateCompetency(c2)["positiveAssertion"] != null)
                result.push(fg.getMetaStateCompetency(c2)["positiveAssertion"].length);
                return result;
            }).catch((err) => {
                assert.fail(err);
            });
            return result;
        }).catch((err) => {
            assert.fail(err);
        }).finally(async () => {
            await deleteById(f.shortId());
            await deleteById(c.shortId());
            await deleteById(c2.shortId());
            await deleteById(a.shortId());
            await deleteById(r.shortId());
        });
        assert.deepEqual(result, [1, 1]);
    })
    it('basic requires false test', async () => {
        let f = await newFramework("basic requires false framework");
        let c = await newCompetency("Add");
        let c2 = await newCompetency("Sum");
        f.addCompetency(c.shortId());
        f.addCompetency(c2.shortId());
        let r = await newRelation(c, c2, EcAlignment.REQUIRES);
        f.addRelation(r.shortId());
        await f.save(null, failure, repo);
        let a = await newFalseAssertion(c2);
        let fg = new EcFrameworkGraph();
        let result = await fg.addFramework(
            f,
            repo,
            () => {},
            () => {}
        ).then(async () => {
            let assertions = [];
            assertions.push(await EcAssertion.get(a.shortId()));
            let result = await fg.processAssertionsBoolean(
                assertions,
                () => {},
                () => {}
            ).then(() => {
                let result = [];
                if (fg.getMetaStateCompetency(c)["negativeAssertion"] != null)
                result.push(fg.getMetaStateCompetency(c)["negativeAssertion"].length);
                if (fg.getMetaStateCompetency(c2)["negativeAssertion"] != null)
                result.push(fg.getMetaStateCompetency(c2)["negativeAssertion"].length);
                return result;
            }).catch((err) => {
                assert.fail(err);
            });
            return result;
        }).catch((err) => {
            assert.fail(err);
        }).finally(async () => {
            await deleteById(f.shortId());
            await deleteById(c.shortId());
            await deleteById(c2.shortId());
            await deleteById(a.shortId());
            await deleteById(r.shortId());
        });
        assert.deepEqual(result, [1, 1]);
    })
    it('basic implies satisfied test', async () => {
        let f = await newFramework("basic implies satisfied framework");
        let c = await newCompetency("Add");
        let c2 = await newCompetency("Sum");
        f.addCompetency(c.shortId());
        f.addCompetency(c2.shortId());
        let r = await newRelation(c, c2, EcAlignment.IMPLIES);
        f.addRelation(r.shortId());
        await f.save(null, failure, repo);
        let a = await newAssertion(c);
        let fg = new EcFrameworkGraph();
        let result = await fg.addFramework(
            f,
            repo,
            () => { },
            () => { }
        ).then(async () => {
            let assertions = [];
            assertions.push(a);
            let result = await fg.processAssertionsBoolean(
                assertions,
                () => { },
                () => { }
            ).then(() => {
                let result = [];
                if (fg.getMetaStateCompetency(c)["positiveAssertion"] != null)
                    result.push(fg.getMetaStateCompetency(c)["positiveAssertion"].length);
                if (fg.getMetaStateCompetency(c2)["positiveAssertion"] != null)
                    result.push(fg.getMetaStateCompetency(c2)["positiveAssertion"].length);
                return result;
            }).catch((err) => {
                assert.fail(err);
            });
            return result;
        }).catch((err) => {
            assert.fail(err);
        }).finally(async () => {
            await deleteById(f.shortId());
            await deleteById(c.shortId());
            await deleteById(c2.shortId());
            await deleteById(a.shortId());
            await deleteById(r.shortId());
        });
        assert.deepEqual(result, [1, 1]);
    })
    it('basic implies false test', async () => {
        let f = await newFramework("basic implies false framework");
        let c = await newCompetency("Add");
        let c2 = await newCompetency("Sum");
        f.addCompetency(c.shortId());
        f.addCompetency(c2.shortId());
        let r = await newRelation(c, c2, EcAlignment.IMPLIES);
        f.addRelation(r.shortId());
        await f.save(null, failure, repo);
        let a = await newFalseAssertion(c);
        let fg = new EcFrameworkGraph();
        let result = await fg.addFramework(
            f,
            repo,
            () => { },
            () => { }
        ).then(async () => {
            let assertions = [];
            assertions.push(await EcAssertion.get(a.shortId()));
            let result = await fg.processAssertionsBoolean(
                assertions,
                () => { },
                () => { }
            ).then(() => {
                let result = [];
                if (fg.getMetaStateCompetency(c)["negativeAssertion"] != null)
                    result.push(fg.getMetaStateCompetency(c)["negativeAssertion"].length);
                if (fg.getMetaStateCompetency(c2)["negativeAssertion"] != null)
                    result.push(fg.getMetaStateCompetency(c2)["negativeAssertion"].length);
                return result;
            }).catch((err) => {
                assert.fail(err);
            });
            return result;
        }).catch((err) => {
            assert.fail(err);
        }).finally(async () => {
            await deleteById(f.shortId());
            await deleteById(c.shortId());
            await deleteById(c2.shortId());
            await deleteById(a.shortId());
            await deleteById(r.shortId());
        });
        assert.deepEqual(result, [1, 1]);
    })
    it('basic narrows true test', async () => {
        let f = await newFramework("basic narrows true framework");
        let c = await newCompetency("Add");
        let c2 = await newCompetency("Sum");
        f.addCompetency(c.shortId());
        f.addCompetency(c2.shortId());
        let r = await newRelation(c, c2, EcAlignment.NARROWS);
        f.addRelation(r.shortId());
        await f.save(null, failure, repo);
        let a = await newAssertion(c2);
        let fg = new EcFrameworkGraph();
        let result = await fg.addFramework(
            f,
            repo,
            () => {},
            () => {}
        ).then(async () => {
            let assertions = [];
            assertions.push(await EcAssertion.get(a.shortId()));
            let result = await fg.processAssertionsBoolean(
                assertions,
                () => {},
                () => {}
            ).then(() => {
                let result = [];
                if (fg.getMetaStateCompetency(c)["positiveAssertion"] != null)
                result.push(fg.getMetaStateCompetency(c)["positiveAssertion"].length);
                if (fg.getMetaStateCompetency(c2)["positiveAssertion"] != null)
                result.push(fg.getMetaStateCompetency(c2)["positiveAssertion"].length);
                return result;
            }).catch((err) => {
                assert.fail(err);
            });
            return result;
        }).catch((err) => {
            assert.fail(err);
        }).finally(async () => {
            await deleteById(f.shortId());
            await deleteById(c.shortId());
            await deleteById(c2.shortId());
            await deleteById(a.shortId());
            await deleteById(r.shortId());
        });
        assert.deepEqual(result, [1, 1]);
    })
    it('basic narrows false test', async () => {
        let f = await newFramework("basic narrows false framework");
        let c = await newCompetency("Add");
        let c2 = await newCompetency("Sum");
        f.addCompetency(c.shortId());
        f.addCompetency(c2.shortId());
        let r = await newRelation(c, c2, EcAlignment.NARROWS);
        f.addRelation(r.shortId());
        await f.save(null, failure, repo);
        let a = await newFalseAssertion(c);
        let fg = new EcFrameworkGraph();
        let result = await fg.addFramework(
            f,
            repo,
            () => {},
            () => {}
        ).then(async () => {
            let assertions = [];
            assertions.push(await EcAssertion.get(a.shortId()));
            let result = await fg.processAssertionsBoolean(
                assertions,
                () => {},
                () => {}
            ).then(() => {
                let result = [];
                if (fg.getMetaStateCompetency(c)["negativeAssertion"] != null)
                result.push(fg.getMetaStateCompetency(c)["negativeAssertion"].length);
                if (fg.getMetaStateCompetency(c2)["negativeAssertion"] != null)
                result.push(fg.getMetaStateCompetency(c2)["negativeAssertion"].length);
                return result;
            }).catch((err) => {
                assert.fail(err);
            });
            return result;
        }).catch((err) => {
            assert.fail(err);
        }).finally(async () => {
            await deleteById(f.shortId());
            await deleteById(c.shortId());
            await deleteById(c2.shortId());
            await deleteById(a.shortId());
            await deleteById(r.shortId());
        });
        assert.deepEqual(result, [1, 1]);
    })
    it('basic narrows narrows test', async () => {
        let f = await newFramework("basic narrows narrows framework");
        let c = await newCompetency("Add");
        let c2 = await newCompetency("Sum");
        let c3 = await newCompetency("Amass");
        f.addCompetency(c.shortId());
        f.addCompetency(c2.shortId());
        f.addCompetency(c3.shortId());
        let r = await newRelation(c, c2, EcAlignment.NARROWS);
        let r2 = await newRelation(c2, c3, EcAlignment.NARROWS);
        f.addRelation(r.shortId());
        f.addRelation(r2.shortId());
        await f.save(null, failure, repo);
        let a = await newAssertion(c3);
        let fg = new EcFrameworkGraph();
        let result = await fg.addFramework(
            f,
            repo,
            () => {},
            () => {}
        ).then(async () => {
            let assertions = [];
            assertions.push(a);
            let result = await fg.processAssertionsBoolean(
                assertions,
                () => {},
                () => {}
            ).then(() => {
                let result = [];
                if (fg.getMetaStateCompetency(c)["positiveAssertion"] != null)
                result.push(fg.getMetaStateCompetency(c)["positiveAssertion"].length);
                if (fg.getMetaStateCompetency(c2)["positiveAssertion"] != null)
                result.push(fg.getMetaStateCompetency(c2)["positiveAssertion"].length);
                if (fg.getMetaStateCompetency(c3)["positiveAssertion"] != null)
                result.push(fg.getMetaStateCompetency(c3)["positiveAssertion"].length);
                return result;
            }).catch((err) => {
                assert.fail(err);
            });
            return result;
        }).catch((err) => {
            assert.fail(err);
        }).finally(async () => {
            await deleteById(f.shortId());
            await deleteById(c.shortId());
            await deleteById(c2.shortId());
            await deleteById(c3.shortId());
            await deleteById(a.shortId());
            await deleteById(r.shortId());
            await deleteById(r2.shortId());
        });
        assert.deepEqual(result, [1, 1, 1]);
    })
    it('basic narrows narrows false test', async () => {
        let f = await newFramework("basic narrows narrows false framework");
        let c = await newCompetency("Add");
        let c2 = await newCompetency("Sum");
        let c3 = await newCompetency("Amass");
        f.addCompetency(c.shortId());
        f.addCompetency(c2.shortId());
        f.addCompetency(c3.shortId());
        let r = await newRelation(c, c2, EcAlignment.NARROWS);
        let r2 = await newRelation(c2, c3, EcAlignment.NARROWS);
        f.addRelation(r.shortId());
        f.addRelation(r2.shortId());
        await f.save(null, failure, repo);
        let a = await newFalseAssertion(c);
        let fg = new EcFrameworkGraph();
        let result = await fg.addFramework(
            f,
            repo,
            () => {},
            () => {}
        ).then(async () => {
            let assertions = [];
            assertions.push(await EcAssertion.get(a.shortId()));
            let result = await fg.processAssertionsBoolean(
                assertions,
                () => {},
                () => {}
            ).then(() => {
                let result = [];
                if (fg.getMetaStateCompetency(c)["negativeAssertion"] != null)
                result.push(fg.getMetaStateCompetency(c)["negativeAssertion"].length);
                if (fg.getMetaStateCompetency(c2)["negativeAssertion"] != null)
                result.push(fg.getMetaStateCompetency(c2)["negativeAssertion"].length);
                if (fg.getMetaStateCompetency(c3)["negativeAssertion"] != null)
                result.push(fg.getMetaStateCompetency(c3)["negativeAssertion"].length);
                return result;
            }).catch((err) => {
                assert.fail(err);
            });
            return result;
        }).catch((err) => {
            assert.fail(err);
        }).finally(async () => {
            await deleteById(f.shortId());
            await deleteById(c.shortId());
            await deleteById(c2.shortId());
            await deleteById(c3.shortId());
            await deleteById(a.shortId());
            await deleteById(r.shortId());
            await deleteById(r2.shortId());
        });
        assert.deepEqual(result, [1, 1, 1]);
    })
    it('callbacks removed test', async () => {
        let f = await newFramework("callbacks removed framework");
        let c = await newCompetency("Add");
        f.addCompetency(c.shortId());
        await f.save(null, failure, repo);
        let a = await newAssertion(c);
        let fg = new EcFrameworkGraph();
        let result = await fg.addFramework(
            f,
            repo
        ).then(async () => {
            let assertions = [];
            assertions.push(a);
            let result = await fg.processAssertionsBoolean(
                assertions,
                () => {},
                () => {}
            ).then(() => {
                let result = [];
                if (fg.getMetaStateCompetency(c)["positiveAssertion"] != null)
                result.push(fg.getMetaStateCompetency(c)["positiveAssertion"].length);
                return result;
            }).catch((err) => {
                assert.fail(err);
            });
            return result;
        }).catch((err) => {
            console.error(err);
            assert.fail(err);
        }).finally(async () => {
            await deleteById(f.shortId());
            await deleteById(c.shortId());
            await deleteById(a.shortId());
        });
        assert.deepEqual(result, [1]);
    })
});