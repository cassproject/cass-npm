const EcFramework = require("../../../../org/cass/competency/EcFramework.js");
const EcRepository = require("../../../../org/cassproject/ebac/repository/EcRepository.js");
const EcIdentity = require("../../../../org/cassproject/ebac/identity/EcIdentity.js");
const EcAssertion = require("../../../../org/cass/profile/EcAssertion.js");
const EcCompetency = require("../../../../org/cass/competency/EcCompetency.js");
const EcRollupRule = require("../../../../org/cass/competency/EcRollupRule.js");
const EcAlignment = require("../../../../org/cass/competency/EcAlignment.js");
const EcIdentityManager = require("../../../../org/cassproject/ebac/identity/EcIdentityManager");
const EcPpk = require("../../../../com/eduworks/ec/crypto/EcPpk.js");
const EcRsaOaepAsyncWorker = require("../../../../com/eduworks/ec/crypto/EcRsaOaepAsyncWorker.js");
const EcEncryptedValue = require("./EcEncryptedValue.js");
const fs = require('fs');
const https = require('https');
const EcCrypto = require("../../../../com/eduworks/ec/crypto/EcCrypto.js");

const schema = {
	"Thing": require("../../../schema/Thing.js")
};

let chai = require("chai");

let hrtime = function() {
    try {
        return [Math.round(performance.now()/1000), performance.now() * 1000];
    } catch (e) {
        // Eat quietly.
    }
    return process.hrtime();
};

var should = chai.should();
var expect = chai.expect;
var assert = chai.assert;

after(()=>EcRsaOaepAsyncWorker.teardown());

let deleteById = async function (id) {
    await EcRepository.get(
        id,
        function (p1) {
            EcRepository._delete(p1, null, function (p1) {
                console.log(p1);
            });
        },
        function (p1) {
            console.log(p1);
        }
    );
};
var failure = function (p1) {
    console.trace(p1);
    assert.fail();
};

if (fs.readFileSync != null) {
    https.globalAgent.options.key = fs.readFileSync('client.key');
    https.globalAgent.options.cert = fs.readFileSync('client.crt');
    https.globalAgent.options.ca = fs.readFileSync('ca.crt');
    // global.axiosOptions.key =  fs.readFileSync('client.key');
    // global.axiosOptions.cert = fs.readFileSync('client.crt');
    // global.axiosOptions.ca = fs.readFileSync('ca.crt');
    //When http2 supports client side self-signed certificates, don't use this.
    process.env['NODE_TLS_REJECT_UNAUTHORIZED'] = 0;
}

let changeNameAndSaveAndCheck = async (rld) => {
    let newName = "Some Thing " + EcCrypto.generateUUID();
    rld.setName(newName);
    await repo.saveTo(rld);
    assert.equal((await EcEncryptedValue.fromEncryptedValue(await EcRepository.get(rld.shortId(), null, null, repo))).getName(), newName);
};

let changeNameAndSaveAndCheckRepo = async (rld) => {
    let newName = "Some Thing " + EcCrypto.generateUUID();
    rld.setName(newName);
    await EcRepository.save(rld);
    assert.equal((await EcEncryptedValue.fromEncryptedValue(await EcRepository.get(rld.shortId(), null, null, repo))).getName(), newName);
};

let changeNameAndSaveAndCheckMultiput = async (rld) => {
    let newName = "Some Thing " + EcCrypto.generateUUID();
    rld.setName(newName);
    await repo.multiput([rld]);
    await setTimeout(()=>{},1000);
    assert.equal((await EcEncryptedValue.fromEncryptedValue(await EcRepository.get(rld.shortId(), null, null, repo))).getName(), newName);
};

let repo = new EcRepository();

let newId1 = null;
describe("EcRepository", () => {
    let id = null;
    let rld = null;
    it('create', async () => {
        EcIdentityManager.default.clearIdentities();
        if ((typeof Cypress !== 'undefined') && Cypress != null && Cypress.env != null)
            process.env.CASS_LOOPBACK = Cypress.env('CASS_LOOPBACK');
        console.log(process.env.CASS_LOOPBACK);
        await repo.init(process.env.CASS_LOOPBACK || "http://localhost/api/", null, null, console.log);
        if (EcIdentityManager.default.ids.length > 0)
            newId1 = EcIdentityManager.default.ids[0];
            else {
                newId1 = new EcIdentity();
                newId1.ppk = EcPpk.fromPem(
                    "-----BEGIN RSA PRIVATE KEY-----MIIEpAIBAAKCAQEAz4BiFucFE9bNcKfGD+e6aPRHl402YM4Z6nrurDRNlnwsWpsCoZasPLkjC314pVtHAI2duZo+esGKDloBsiLxASRJo3R2XiXVh2Y8U1RcHA5mWL4tMG5UY2d0libpNEHbHPNBmooVYpA2yhxN/vGibIk8x69uZWxJcFOxOg6zWG8EjF8UMgGnRCVSMTY3THhTlfZ0cGUzvrfb7OvHUgdCe285XkmYkj/V9P/m7hbWoOyJAJSTOm4/s6fIKpl72lblfN7bKaxTCsJp6/rQdmUeo+PIaa2lDOfo7dWbuTMcqkZ93kispNfYYhsEGUGlCsrrVWhlve8MenO4GdLsFP+HRwIDAQABAoIBAGaQpOuBIYde44lNxJ7UAdYi+Mg2aqyK81Btl0/TQo6hriLTAAfzPAt/z4y8ZkgFyCDD3zSAw2VWCPFzF+d/UfUohKWgyWlb9iHJLQRbbHQJwhkXV6raviesWXpmnVrROocizkie/FcNxac9OmhL8+cGJt7lHgJP9jTpiW6TGZ8ZzM8KBH2l80x9AWdvCjsICuPIZRjc706HtkKZzTROtq6Z/F4Gm0uWRnwAZrHTRpnh8qjtdBLYFrdDcUoFtzOM6UVRmocTfsNe4ntPpvwY2aGTWY7EmTj1kteMJ+fCQFIS+KjyMWQHsN8yQNfD5/j2uv6/BdSkO8uorGSJT6DwmTECgYEA8ydoQ4i58+A1udqA+fujM0Zn46++NTehFe75nqIt8rfQgoduBam3lE5IWj2U2tLQeWxQyr1ZJkLbITtrAI3PgfMnuFAii+cncwFo805Fss/nbKx8K49vBuCEAq3MRhLjWy3ZvIgUHj67jWvl50dbNqc7TUguxhS4BxGr/cPPkP0CgYEA2nbJPGzSKhHTETL37NWIUAdU9q/6NVRISRRXeRqZYwE1VPzs2sIUxA8zEDBHX7OtvCKzvZy1Lg5Unx1nh4nCEVkbW/8npLlRG2jOcZJF6NRfhzwLz3WMIrP6j9SmjJaB+1mnrTjfsg36tDEPDjjJLjJHCx9z/qRJh1v4bh4aPpMCgYACG31T2IOEEZVlnvcvM3ceoqWT25oSbAEBZ6jSLyWmzOEJwJK7idUFfAg0gAQiQWF9K+snVqzHIB02FIXA43nA7pKRjmA+RiqZXJHEShFgk1y2HGiXGA8mSBvcyhTTJqbBy4vvjl5eRLzrZNwBPSUVPC3PZajCHrvZk9WhxWivIQKBgQCzCu1MH2dy4R7ZlqsIJ8zKweeJMZpfQI7pjclO0FTrhh7+Yzd+5db9A/P2jYrBTVHSwaILgTYf49DIguHJfEZXz26TzB7iapqlWxTukVHISt1ryPNo+E58VoLAhChnSiaHJ+g7GESE+d4A9cAACNwgh0YgQIvhIyW70M1e+j7KDwKBgQDQSBLFDFmvvTP3sIRAr1+0OZWd1eRcwdhs0U9GwootoCoUP/1Y64pqukT6B9oIB/No9Nyn8kUX3/ZDtCslaGKEUGMJXQ4hc5J+lq0tSi9ZWBdhqOuMPEfUF3IxW+9yeILP4ppUBn1m5MVOWg5CvuuEeCmy4bhMaUErUlHZ78t5cA==-----END RSA PRIVATE KEY-----"
                );
                EcIdentityManager.default.ids = [];
                EcIdentityManager.default.addIdentity(newId1);
            }
        rld = new schema.Thing();
        rld.generateId(repo.selectedServer);
        rld.addOwner(newId1.ppk.toPk());
        rld.setName("Some Thing");
        rld.setDescription("Some Description");
        rld.squirrel = "brown";
    });
    it('save (to)', async () => {
        await changeNameAndSaveAndCheck(rld);
    }).timeout(10000);
    it('encrypt and save (to)', async () => {
        EcEncryptedValue.encryptOnSave(rld.shortId(), true);
        await changeNameAndSaveAndCheck(rld);
    }).timeout(10000);
    it('encrypt some more', async () => {
        rld = await EcEncryptedValue.toEncryptedValue(rld);
        rld = await EcEncryptedValue.toEncryptedValue(rld);
        rld = await EcEncryptedValue.toEncryptedValue(rld);
        rld = await EcEncryptedValue.toEncryptedValue(rld);
        rld = await EcEncryptedValue.toEncryptedValue(rld);
        rld = await EcEncryptedValue.toEncryptedValue(rld);
        EcEncryptedValue.encryptOnSave(rld.shortId(), true);
        await repo.saveTo(rld);
    }).timeout(10000);
    it('search', async () => {
        let results = await repo.search(`@id:"${rld.shortId()}"`);
        assert.equal(results.length, 1);
        assert.equal(results[0].shortId(), rld.shortId());
        results[0] = await EcEncryptedValue.fromEncryptedValue(results[0]);
        assert.equal(results[0].squirrel, "brown");
    }).timeout(10000);
    it('decrypt and save (to)', async () => {
        rld = await EcEncryptedValue.fromEncryptedValue(await EcRepository.get(rld.shortId(), null, null, repo));
        EcEncryptedValue.encryptOnSave(rld.shortId(), false);
        await changeNameAndSaveAndCheck(rld);
    }).timeout(10000);
    it('search', async () => {
        let results = await repo.search(`@id:"${rld.shortId()}"`);
        assert.equal(results.length, 1);
        assert.equal(results[0].shortId(), rld.shortId());
    }).timeout(10000);
    it('encrypt and save (to)', async () => {
        EcEncryptedValue.encryptOnSave(rld.shortId(), true);
        await changeNameAndSaveAndCheck(rld);
    }).timeout(10000);
    it('search', async () => {
        let results = await repo.search(`@id:"${rld.shortId()}"`);
        assert.equal(results.length, 1);
        assert.equal(results[0].shortId(), rld.shortId());
    }).timeout(10000);
    it('decrypt and save (to)', async () => {
        EcEncryptedValue.encryptOnSave(rld.shortId(), false);
        await changeNameAndSaveAndCheck(rld);
    }).timeout(10000);
    it('search', async () => {
        let results = await repo.search(`@id:"${rld.shortId()}"`);
        assert.equal(results.length, 1);
        assert.equal(results[0].shortId(), rld.shortId());
    }).timeout(10000);
    it('create', async () => {
        rld = new schema.Thing();
        rld.generateId(repo.selectedServer);
        rld.addOwner(newId1.ppk.toPk());
        rld.setName("Some Thing");
        rld.setDescription("Some Description");
    });
    it('save (ecrepository)', async () => {
        await changeNameAndSaveAndCheckRepo(rld);
    }).timeout(10000);
    it('encrypt and save (ecrepository)', async () => {
        EcEncryptedValue.encryptOnSave(rld.shortId(), true);
        await changeNameAndSaveAndCheckRepo(rld);
    }).timeout(10000);
    it('search', async () => {
        let results = await repo.search(`@id:"${rld.shortId()}"`);
        assert.equal(results.length, 1);
        assert.equal(results[0].shortId(), rld.shortId());
    }).timeout(10000);
    it('decrypt and save (ecrepository)', async () => {
        EcEncryptedValue.encryptOnSave(rld.shortId(), false);
        await changeNameAndSaveAndCheckRepo(rld);
    }).timeout(10000);
    it('search', async () => {
        let results = await repo.search(`@id:"${rld.shortId()}"`);
        assert.equal(results.length, 1);
        assert.equal(results[0].shortId(), rld.shortId());
    }).timeout(10000);
    it('save (ecrepository)', async () => {
        await changeNameAndSaveAndCheckRepo(rld);
    }).timeout(10000);
    it('encrypt and save (ecrepository)', async () => {
        EcEncryptedValue.encryptOnSave(rld.shortId(), true);
        await changeNameAndSaveAndCheckRepo(rld);
    }).timeout(10000);
    it('search', async () => {
        let results = await repo.search(`@id:"${rld.shortId()}"`);
        assert.equal(results.length, 1);
        assert.equal(results[0].shortId(), rld.shortId());
    }).timeout(10000);
    it('decrypt and save (ecrepository)', async () => {
        EcEncryptedValue.encryptOnSave(rld.shortId(), false);
        await changeNameAndSaveAndCheckRepo(rld);
    }).timeout(10000);
    it('search', async () => {
        let results = await repo.search(`@id:"${rld.shortId()}"`);
        assert.equal(results.length, 1);
        assert.equal(results[0].shortId(), rld.shortId());
    }).timeout(10000);
    it('create', async () => {
        rld = new schema.Thing();
        rld.generateId(repo.selectedServer);
        rld.addOwner(newId1.ppk.toPk());
        rld.setName("Some Thing");
        rld.setDescription("Some Description");
    });
    it('save (multiput)', async () => {
        await changeNameAndSaveAndCheckMultiput(rld);
    }).timeout(10000);
    it('encrypt and save (multiput)', async () => {
        EcEncryptedValue.encryptOnSave(rld.shortId(), true);
        await changeNameAndSaveAndCheckMultiput(rld);
    }).timeout(10000);
    it('search', async () => {
        let results = await repo.search(`@id:"${rld.shortId()}"`);
        assert.equal(results.length, 1);
        assert.equal(results[0].shortId(), rld.shortId());
    }).timeout(10000);
    it('decrypt and save (multiput)', async () => {
        EcEncryptedValue.encryptOnSave(rld.shortId(), false);
        await changeNameAndSaveAndCheckMultiput(rld);
    }).timeout(10000);
    it('search', async () => {
        let results = await repo.search(`@id:"${rld.shortId()}"`);
        assert.equal(results.length, 1);
        assert.equal(results[0].shortId(), rld.shortId());
    }).timeout(10000);
    it('save (multiput)', async () => {
        await changeNameAndSaveAndCheckMultiput(rld);
    }).timeout(10000);
    it('encrypt and save (multiput)', async () => {
        EcEncryptedValue.encryptOnSave(rld.shortId(), true);
        await changeNameAndSaveAndCheckMultiput(rld);
    }).timeout(10000);
    it('search', async () => {
        let results = await repo.search(`@id:"${rld.shortId()}"`);
        assert.equal(results.length, 1);
        assert.equal(results[0].shortId(), rld.shortId());
    }).timeout(10000);
    it('decrypt and save (multiput)', async () => {
        EcEncryptedValue.encryptOnSave(rld.shortId(), false);
        await changeNameAndSaveAndCheckMultiput(rld);
    }).timeout(10000);
    it('search', async () => {
        let results = await repo.search(`@id:"${rld.shortId()}"`);
        assert.equal(results.length, 1);
        assert.equal(results[0].shortId(), rld.shortId());
    }).timeout(10000);
    it('registered create', async () => {
        rld = new schema.Thing();
        rld.id = "https://this.object.is.not.here/"+EcCrypto.generateUUID();
        rld.addOwner(newId1.ppk.toPk());
        rld.setName("Some Thing");
        rld.setDescription("Some Description");
    });
    it('registered save (to)', async () => {
        await changeNameAndSaveAndCheck(rld);
    }).timeout(10000);
    it('registered encrypt and save (to)', async () => {
        EcEncryptedValue.encryptOnSave(rld.shortId(), true);
        await changeNameAndSaveAndCheck(rld);
    }).timeout(10000);
    it('registered search', async () => {
        let results = await repo.search(`@id:"${rld.shortId()}"`);
        assert.equal(results.length, 1);
        assert.equal(results[0].shortId(), rld.shortId());
    }).timeout(10000);
    it('registered decrypt and save (to)', async () => {
        EcEncryptedValue.encryptOnSave(rld.shortId(), false);
        await changeNameAndSaveAndCheck(rld);
    }).timeout(10000);
    it('registered search', async () => {
        let results = await repo.search(`@id:"${rld.shortId()}"`);
        assert.equal(results.length, 1);
        assert.equal(results[0].shortId(), rld.shortId());
    }).timeout(10000);
    it('registered encrypt and save (to)', async () => {
        EcEncryptedValue.encryptOnSave(rld.shortId(), true);
        await changeNameAndSaveAndCheck(rld);
    }).timeout(10000);
    it('registered search', async () => {
        let results = await repo.search(`@id:"${rld.shortId()}"`);
        assert.equal(results.length, 1);
        assert.equal(results[0].shortId(), rld.shortId());
    }).timeout(10000);
    it('registered decrypt and save (to)', async () => {
        EcEncryptedValue.encryptOnSave(rld.shortId(), false);
        await changeNameAndSaveAndCheck(rld);
    }).timeout(10000);
    it('registered search', async () => {
        let results = await repo.search(`@id:"${rld.shortId()}"`);
        assert.equal(results.length, 1);
        assert.equal(results[0].shortId(), rld.shortId());
    }).timeout(10000);
    it('registered create', async () => {
        rld = new schema.Thing();
        rld.id = "https://this.object.is.not.here/"+EcCrypto.generateUUID();
        rld.addOwner(newId1.ppk.toPk());
        rld.setName("Some Thing");
        rld.setDescription("Some Description");
    });
    it('registered save (multiput)', async () => {
        await changeNameAndSaveAndCheckMultiput(rld);
    }).timeout(10000);
    it('registered encrypt and save (multiput)', async () => {
        EcEncryptedValue.encryptOnSave(rld.shortId(), true);
        await changeNameAndSaveAndCheckMultiput(rld);
    }).timeout(10000);
    it('registered search', async () => {
        let results = await repo.search(`@id:"${rld.shortId()}"`);
        assert.equal(results.length, 1);
        assert.equal(results[0].shortId(), rld.shortId());
    }).timeout(10000);
    it('registered decrypt and save (multiput)', async () => {
        EcEncryptedValue.encryptOnSave(rld.shortId(), false);
        await changeNameAndSaveAndCheckMultiput(rld);
    }).timeout(10000);
    it('registered search', async () => {
        let results = await repo.search(`@id:"${rld.shortId()}"`);
        assert.equal(results.length, 1);
        assert.equal(results[0].shortId(), rld.shortId());
    }).timeout(10000);
    it('registered save (multiput)', async () => {
        await changeNameAndSaveAndCheckMultiput(rld);
    }).timeout(10000);
    it('registered encrypt and save (multiput)', async () => {
        EcEncryptedValue.encryptOnSave(rld.shortId(), true);
        await changeNameAndSaveAndCheckMultiput(rld);
    }).timeout(10000);
    it('registered search', async () => {
        let results = await repo.search(`@id:"${rld.shortId()}"`);
        assert.equal(results.length, 1);
        assert.equal(results[0].shortId(), rld.shortId());
    }).timeout(10000);
    it('registered decrypt and save (multiput)', async () => {
        EcEncryptedValue.encryptOnSave(rld.shortId(), false);
        await changeNameAndSaveAndCheckMultiput(rld);
    }).timeout(10000);
    it('registered search', async () => {
        let results = await repo.search(`@id:"${rld.shortId()}"`);
        assert.equal(results.length, 1);
        assert.equal(results[0].shortId(), rld.shortId());
    }).timeout(10000);
});