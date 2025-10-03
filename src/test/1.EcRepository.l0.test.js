const fs = require('fs');
const https = require('https');

const schema = {
    "Thing": require('../org/schema/Thing.js')
};

let chai = require("chai");
const EcRsaOaepAsyncWorker = require('../com/eduworks/ec/crypto/EcRsaOaepAsyncWorker.js');
const EcRepository = require('../org/cassproject/ebac/repository/EcRepository.js');
const EcCrypto = require('../com/eduworks/ec/crypto/EcCrypto.js');
const EcEncryptedValue = require('../org/cassproject/ebac/repository/EcEncryptedValue.js');
const EcIdentityManager = require('../org/cassproject/ebac/identity/EcIdentityManager.js');
const EcIdentity = require('../org/cassproject/ebac/identity/EcIdentity.js');
const EcPpk = require('../com/eduworks/ec/crypto/EcPpk.js');

let hrtime = function () {
    try {
        return [Math.round(performance.now() / 1000), performance.now() * 1000];
    } catch (e) {
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

after(() => EcRsaOaepAsyncWorker.teardown());

let deleteById = async function (id) {
    let p1 = await EcRepository.get(id, null, null, repo);
    await EcRepository._delete(p1, null, null, repo);
    console.log(process.env.TESTLEVEL);
    if (process.env.TESTLEVEL == "15")
        await EcRepository.get(id, null, null, repo);
};
let failure = function (p1) {
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
    //process.env['NODE_TLS_REJECT_UNAUTHORIZED'] = 0;
}

let changeNameAndSaveAndCheck = async (rld) => {
    let newName = "Some Thing " + EcCrypto.generateUUID();
    rld.setName(newName);
    await repo.saveTo(rld);
    console.log(rld.id);
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
    assert.equal((await EcEncryptedValue.fromEncryptedValue(await EcRepository.get(rld.shortId(), null, null, repo))).getName(), newName);
};

let repo = new EcRepository();

let newId1 = null;
describe("EcRepository (L0 Cache)", () => {
    let id = null;
    let rld = null;
    let emptyEim = new EcIdentityManager();
    it('create', async () => {
        EcRepository.caching = false;
        EcRepository.cachingL2 = false;
        EcIdentityManager.default.clearIdentities();
        if ((typeof Cypress !== 'undefined') && Cypress != null && Cypress.env != null)
            process.env.CASS_LOOPBACK = Cypress.env('CASS_LOOPBACK');
        if ((typeof Cypress !== 'undefined') && Cypress != null && Cypress.env != null)
            process.env.TESTLEVEL = Cypress.env('TESTLEVEL');
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
        assert.notEqual(EcIdentityManager.default.ids.length, 0);
    });
    it('save (to)', async () => {
        await changeNameAndSaveAndCheck(rld);
    });
    it('encrypt and save (to)', async () => {
        EcEncryptedValue.encryptOnSave(rld.shortId(), true);
        await changeNameAndSaveAndCheck(rld);
    });
    it('cannot be accessed by anonymous users', async () => {
        assert.isNull(await EcRepository.get(rld.shortId(), null, null, null, emptyEim));
    });
    it('encrypt some more', async () => {
        await changeNameAndSaveAndCheck(rld);
        rld = await EcEncryptedValue.toEncryptedValue(rld);
        rld = await EcEncryptedValue.toEncryptedValue(rld);
        rld = await EcEncryptedValue.toEncryptedValue(rld);
        rld = await EcEncryptedValue.toEncryptedValue(rld);
        rld = await EcEncryptedValue.toEncryptedValue(rld);
        rld = await EcEncryptedValue.toEncryptedValue(rld);
        EcEncryptedValue.encryptOnSave(rld.shortId(), true);
        await repo.saveTo(rld);
    });
    it('cannot be accessed by anonymous users', async () => {
        assert.isNull(await EcRepository.get(rld.shortId(), null, null, null, emptyEim));
    });
    it('search', async () => {
        let results = await repo.search(`@id:"${rld.shortId()}"`);
        assert.equal(results.length, 1);
        assert.equal(results[0].shortId(), rld.shortId());
        results[0] = await EcEncryptedValue.fromEncryptedValue(results[0]);
        assert.equal(results[0].squirrel, "brown");
    });
    it('decrypt and save (to)', async () => {
        rld = await EcEncryptedValue.fromEncryptedValue(await EcRepository.get(rld.shortId(), null, null, repo));
        EcEncryptedValue.encryptOnSave(rld.shortId(), false);
        await changeNameAndSaveAndCheck(rld);
    });
    it('search', async () => {
        let results = await repo.search(`@id:"${rld.shortId()}"`);
        assert.equal(results.length, 1);
        assert.equal(results[0].shortId(), rld.shortId());
    });
    it('searchCache', async () => {
        EcRepository.caching = true;
        let results = await repo.search(`@id:"${rld.shortId()}"`);
        assert.equal(results.length, 1);
        assert.equal(results[0].shortId(), rld.shortId());
        results = await EcRepository.get(rld.shortId());
        console.log(EcRepository.cacheDB);
        EcRepository.caching = false;
    });
    it('encrypt and save (to)', async () => {
        EcEncryptedValue.encryptOnSave(rld.shortId(), true);
        await changeNameAndSaveAndCheck(rld);
    });
    it('cannot be accessed by anonymous users', async () => {
        assert.isNull(await EcRepository.get(rld.shortId(), null, null, null, emptyEim));
    });
    it('search', async () => {
        let results = await repo.search(`@id:"${rld.shortId()}"`);
        assert.equal(results.length, 1);
        assert.equal(results[0].shortId(), rld.shortId());
    });
    it('decrypt and save (to)', async () => {
        EcEncryptedValue.encryptOnSave(rld.shortId(), false);
        await changeNameAndSaveAndCheck(rld);
    });
    it('history', async () => {
        let history = await EcRepository.history(rld.shortId(), repo);
        assert.isAbove(history.length, 6, "History is not populated.");
    });
    it('search', async () => {
        let results = await repo.search(`@id:"${rld.shortId()}"`);
        assert.equal(results.length, 1);
        assert.equal(results[0].shortId(), rld.shortId());
    });
    it('delete', async () => {
        await deleteById(rld.shortId());
        let results = await repo.search(`@id:"${rld.shortId()}"`);
        assert.equal(results.length, 0);
        let results2 = await EcRepository.get(rld.shortId(), null, null, repo);
        assert.equal(results2, null);
    });
    it('create', async () => {
        rld = new schema.Thing();
        rld.generateId(repo.selectedServer);
        rld.addOwner(newId1.ppk.toPk());
        rld.setName("Some Thing");
        rld.setDescription("Some Description");
    });
    it('save (ecrepository)', async () => {
        await changeNameAndSaveAndCheckRepo(rld);
    });
    it('encrypt and save (ecrepository)', async () => {
        EcEncryptedValue.encryptOnSave(rld.shortId(), true);
        await changeNameAndSaveAndCheckRepo(rld);
    });
    it('cannot be accessed by anonymous users', async () => {
        assert.isNull(await EcRepository.get(rld.shortId(), null, null, null, emptyEim));
    });
    it('search', async () => {
        let results = await repo.search(`@id:"${rld.shortId()}"`);
        assert.equal(results.length, 1);
        assert.equal(results[0].shortId(), rld.shortId());
    });
    it('decrypt and save (ecrepository)', async () => {
        EcEncryptedValue.encryptOnSave(rld.shortId(), false);
        await changeNameAndSaveAndCheckRepo(rld);
    });
    it('search', async () => {
        let results = await repo.search(`@id:"${rld.shortId()}"`);
        assert.equal(results.length, 1);
        assert.equal(results[0].shortId(), rld.shortId());
    });
    it('save (ecrepository)', async () => {
        await changeNameAndSaveAndCheckRepo(rld);
    });
    it('encrypt and save (ecrepository)', async () => {
        EcEncryptedValue.encryptOnSave(rld.shortId(), true);
        await changeNameAndSaveAndCheckRepo(rld);
    });
    it('cannot be accessed by anonymous users', async () => {
        assert.isNull(await EcRepository.get(rld.shortId(), null, null, null, emptyEim));
    });
    it('search', async () => {
        let results = await repo.search(`@id:"${rld.shortId()}"`);
        assert.equal(results.length, 1);
        assert.equal(results[0].shortId(), rld.shortId());
    });
    it('decrypt and save (ecrepository)', async () => {
        EcEncryptedValue.encryptOnSave(rld.shortId(), false);
        await changeNameAndSaveAndCheckRepo(rld);
    });
    it('search', async () => {
        let results = await repo.search(`@id:"${rld.shortId()}"`);
        assert.equal(results.length, 1);
        assert.equal(results[0].shortId(), rld.shortId());
    });
    it('delete', async () => {
        await deleteById(rld.shortId());
        let results = await repo.search(`@id:"${rld.shortId()}"`);
        assert.equal(results.length, 0);
        let results2 = await EcRepository.get(rld.shortId(), null, null, repo);
        assert.equal(results2, null);
    });
    it('create', async () => {
        rld = new schema.Thing();
        rld.generateId(repo.selectedServer);
        rld.addOwner(newId1.ppk.toPk());
        rld.setName("Some Thing");
        rld.setDescription("Some Description");
    });
    it('save (multiput)', async () => {
        await changeNameAndSaveAndCheckMultiput(rld);
    });
    it('encrypt and save (multiput)', async () => {
        EcEncryptedValue.encryptOnSave(rld.shortId(), true);
        await changeNameAndSaveAndCheckMultiput(rld);
    });
    it('cannot be accessed by anonymous users', async () => {
        assert.isNull(await EcRepository.get(rld.shortId(), null, null, null, emptyEim));
    });
    it('search', async () => {
        let results = await repo.search(`@id:"${rld.shortId()}"`);
        assert.equal(results.length, 1);
        assert.equal(results[0].shortId(), rld.shortId());
    });
    it('decrypt and save (multiput)', async () => {
        EcEncryptedValue.encryptOnSave(rld.shortId(), false);
        await changeNameAndSaveAndCheckMultiput(rld);
    });
    it('search', async () => {
        let results = await repo.search(`@id:"${rld.shortId()}"`);
        assert.equal(results.length, 1);
        assert.equal(results[0].shortId(), rld.shortId());
    });
    it('save (multiput)', async () => {
        await changeNameAndSaveAndCheckMultiput(rld);
    });
    it('encrypt and save (multiput)', async () => {
        EcEncryptedValue.encryptOnSave(rld.shortId(), true);
        await changeNameAndSaveAndCheckMultiput(rld);
    });
    it('cannot be accessed by anonymous users', async () => {
        assert.isNull(await EcRepository.get(rld.shortId(), null, null, null, emptyEim));
    });
    it('search', async () => {
        let results = await repo.search(`@id:"${rld.shortId()}"`);
        assert.equal(results.length, 1);
        assert.equal(results[0].shortId(), rld.shortId());
    });
    it('decrypt and save (multiput)', async () => {
        EcEncryptedValue.encryptOnSave(rld.shortId(), false);
        await changeNameAndSaveAndCheckMultiput(rld);
    });
    it('search', async () => {
        let results = await repo.search(`@id:"${rld.shortId()}"`);
        assert.equal(results.length, 1);
        assert.equal(results[0].shortId(), rld.shortId());
    });
    it('delete', async () => {
        await deleteById(rld.shortId());
        let results = await repo.search(`@id:"${rld.shortId()}"`);
        assert.equal(results.length, 0);
        let results2 = await EcRepository.get(rld.shortId(), null, null, repo);
        assert.equal(results2, null);
    });
    it('registered create', async () => {
        rld = new schema.Thing();
        rld.id = "https://this.object.is.not.here/" + EcCrypto.generateUUID();
        rld.addOwner(newId1.ppk.toPk());
        rld.setName("Some Thing");
        rld.setDescription("Some Description");
    });
    it('registered save (to)', async () => {
        await changeNameAndSaveAndCheck(rld);
    });
    it('registered encrypt and save (to)', async () => {
        EcEncryptedValue.encryptOnSave(rld.shortId(), true);
        await changeNameAndSaveAndCheck(rld);
    });
    it('cannot be accessed by anonymous users', async () => {
        assert.isNull(await EcRepository.get(rld.shortId(), null, null, null, emptyEim));
    });
    it('registered search', async () => {
        let results = await repo.search(`@id:"${rld.shortId()}"`);
        assert.equal(results.length, 1);
        assert.equal(results[0].shortId(), rld.shortId());
    });
    it('registered decrypt and save (to)', async () => {
        EcEncryptedValue.encryptOnSave(rld.shortId(), false);
        await changeNameAndSaveAndCheck(rld);
    });
    it('registered search', async () => {
        let results = await repo.search(`@id:"${rld.shortId()}"`);
        assert.equal(results.length, 1);
        assert.equal(results[0].shortId(), rld.shortId());
    });
    it('registered encrypt and save (to)', async () => {
        EcEncryptedValue.encryptOnSave(rld.shortId(), true);
        await changeNameAndSaveAndCheck(rld);
    });
    it('cannot be accessed by anonymous users', async () => {
        assert.isNull(await EcRepository.get(rld.shortId(), null, null, null, emptyEim));
    });
    it('registered search', async () => {
        let results = await repo.search(`@id:"${rld.shortId()}"`);
        assert.equal(results.length, 1);
        assert.equal(results[0].shortId(), rld.shortId());
    });
    it('registered decrypt and save (to)', async () => {
        EcEncryptedValue.encryptOnSave(rld.shortId(), false);
        await changeNameAndSaveAndCheck(rld);
    });
    it('registered search', async () => {
        let results = await repo.search(`@id:"${rld.shortId()}"`);
        assert.equal(results.length, 1);
        assert.equal(results[0].shortId(), rld.shortId());
    });
    it('registered create', async () => {
        rld = new schema.Thing();
        rld.id = "https://this.object.is.not.here/" + EcCrypto.generateUUID();
        rld.addOwner(newId1.ppk.toPk());
        rld.setName("Some Thing");
        rld.setDescription("Some Description");
    });
    it('registered save (multiput)', async () => {
        await changeNameAndSaveAndCheckMultiput(rld);
    });
    it('registered encrypt and save (multiput)', async () => {
        EcEncryptedValue.encryptOnSave(rld.shortId(), true);
        await changeNameAndSaveAndCheckMultiput(rld);
    });
    it('cannot be accessed by anonymous users', async () => {
        assert.isNull(await EcRepository.get(rld.shortId(), null, null, null, emptyEim));
    });
    it('registered search', async () => {
        let results = await repo.search(`@id:"${rld.shortId()}"`);
        assert.equal(results.length, 1);
        assert.equal(results[0].shortId(), rld.shortId());
    });
    it('registered decrypt and save (multiput)', async () => {
        EcEncryptedValue.encryptOnSave(rld.shortId(), false);
        await changeNameAndSaveAndCheckMultiput(rld);
    });
    it('registered search', async () => {
        let results = await repo.search(`@id:"${rld.shortId()}"`);
        assert.equal(results.length, 1);
        assert.equal(results[0].shortId(), rld.shortId());
    });
    it('registered save (multiput)', async () => {
        await changeNameAndSaveAndCheckMultiput(rld);
    });
    it('registered encrypt and save (multiput)', async () => {
        EcEncryptedValue.encryptOnSave(rld.shortId(), true);
        await changeNameAndSaveAndCheckMultiput(rld);
    });
    it('cannot be accessed by anonymous users', async () => {
        assert.isNull(await EcRepository.get(rld.shortId(), null, null, null, emptyEim));
    });
    it('registered search', async () => {
        let results = await repo.search(`@id:"${rld.shortId()}"`);
        assert.equal(results.length, 1);
        assert.equal(results[0].shortId(), rld.shortId());
    });
    it('registered decrypt and save (multiput)', async () => {
        EcEncryptedValue.encryptOnSave(rld.shortId(), false);
        await changeNameAndSaveAndCheckMultiput(rld);
    });
    it('registered search', async () => {
        let results = await repo.search(`@id:"${rld.shortId()}"`);
        assert.equal(results.length, 1);
        assert.equal(results[0].shortId(), rld.shortId());
    });
    it('registered history', async () => {
        let history = await EcRepository.history(rld.shortId(), repo);
        assert.isTrue(history.length == 6, "History is not populated.");
    });
    it('registered delete', async () => {
        await repo.deleteRegistered(rld);
        let results = await repo.search(`@id:"${rld.shortId()}"`);
        assert.equal(results.length, 0);
        let results2 = await EcRepository.get(rld.shortId(), null, null, repo);
        assert.equal(results2, null);
    });
    it('multidelete', async () => {
        console.log(process.env.TESTLEVEL);
        if (process.env.TESTLEVEL == 15 || process.env.TESTLEVEL?.trim() == "15") return;
        rld = new schema.Thing();
        rld.generateId(repo.selectedServer);
        rld.addOwner(newId1.ppk.toPk());
        rld.setName("Some Thing");
        rld.setDescription("Some Description");
        let rld2 = new schema.Thing();
        rld2.generateId(repo.selectedServer);
        rld2.addOwner(newId1.ppk.toPk());
        rld2.setName("Some Thing2");
        rld2.setDescription("Some Description");
        EcEncryptedValue.encryptOnSave(rld2.shortId(), true);
        let rld3 = new schema.Thing();
        rld3.id = "https://this.object.is.not.here/" + EcCrypto.generateUUID();
        rld3.addOwner(newId1.ppk.toPk());
        rld3.setName("Some Thing3");
        rld3.setDescription("Some Description");
        let rld4 = new schema.Thing();
        rld4.id = "https://this.object.is.not.here/" + EcCrypto.generateUUID();
        rld4.addOwner(newId1.ppk.toPk());
        rld4.setName("Some Thing4");
        rld4.setDescription("Some Description");
        EcEncryptedValue.encryptOnSave(rld4.shortId(), true);
        let rld5 = new schema.Thing();
        rld5.generateId(repo.selectedServer);
        rld5.addOwner(newId1.ppk.toPk());
        rld5.setName("Some Thing2");
        rld5.setDescription("Some Description");
        let rld6 = new schema.Thing();
        rld6.id = "https://this.object.is.not.here/" + EcCrypto.generateUUID();
        rld6.addOwner(newId1.ppk.toPk());
        rld6.setName("Some Thing4");
        rld6.setDescription("Some Description");
        await repo.multiput([rld, rld2, rld3, rld4, rld5, rld6]);
        EcEncryptedValue.encryptOnSave(rld5.shortId(), true);
        EcEncryptedValue.encryptOnSave(rld6.shortId(), true);
        await repo.multiput([rld, rld2, rld3, rld4, rld5, rld6]);
        let results = await repo.search(`@id:"${rld.shortId()}"`);
        assert.equal(results.length, 1);
        assert.equal(results[0].shortId(), rld.shortId());
        results = await repo.search(`@id:"${rld2.shortId()}"`);
        assert.equal(results.length, 1);
        assert.equal(results[0].shortId(), rld2.shortId());
        results = await repo.search(`@id:"${rld3.shortId()}"`);
        assert.equal(results.length, 1);
        assert.equal(results[0].shortId(), rld3.shortId());
        results = await repo.search(`@id:"${rld4.shortId()}"`);
        assert.equal(results.length, 1);
        assert.equal(results[0].shortId(), rld4.shortId());
        results = await repo.search(`@id:"${rld5.shortId()}"`);
        assert.equal(results.length, 1);
        assert.equal(results[0].shortId(), rld5.shortId());
        results = await repo.search(`@id:"${rld6.shortId()}"`);
        assert.equal(results.length, 1);
        assert.equal(results[0].shortId(), rld6.shortId());
        await repo.multidelete([rld.shortId(), rld2.shortId(), rld3.shortId(), rld4.shortId(), rld5.shortId(), rld6.shortId()], null, null, emptyEim);
        results = await repo.search(`@id:"${rld.shortId()}"`);
        assert.equal(results.length, 1);
        results = await repo.search(`@id:"${rld2.shortId()}"`);
        assert.equal(results.length, 1);
        results = await repo.search(`@id:"${rld3.shortId()}"`);
        assert.equal(results.length, 1);
        results = await repo.search(`@id:"${rld4.shortId()}"`);
        assert.equal(results.length, 1);
        results = await repo.search(`@id:"${rld5.shortId()}"`);
        assert.equal(results.length, 1);
        results = await repo.search(`@id:"${rld6.shortId()}"`);
        assert.equal(results.length, 1);
        let results2 = await EcRepository.get(rld.shortId(), null, null, repo);
        assert.isNotNull(results2);
        results2 = await EcRepository.get(rld2.shortId(), null, null, repo);
        assert.isNotNull(results2);
        results2 = await EcRepository.get(rld3.shortId(), null, null, repo);
        assert.isNotNull(results2);
        results2 = await EcRepository.get(rld4.shortId(), null, null, repo);
        assert.isNotNull(results2);
        results2 = await EcRepository.get(rld5.shortId(), null, null, repo);
        assert.isNotNull(results2);
        results2 = await EcRepository.get(rld6.shortId(), null, null, repo);
        assert.isNotNull(results2);
        await repo.multidelete([rld.shortId(), rld2.shortId(), rld3.shortId(), rld4.shortId(), rld5.shortId(), rld6.shortId()]);
        results = await repo.search(`@id:"${rld.shortId()}"`);
        assert.equal(results.length, 0);
        results = await repo.search(`@id:"${rld2.shortId()}"`);
        assert.equal(results.length, 0);
        results = await repo.search(`@id:"${rld3.shortId()}"`);
        assert.equal(results.length, 0);
        results = await repo.search(`@id:"${rld4.shortId()}"`);
        assert.equal(results.length, 0);
        results = await repo.search(`@id:"${rld5.shortId()}"`);
        assert.equal(results.length, 0);
        results = await repo.search(`@id:"${rld6.shortId()}"`);
        assert.equal(results.length, 0);
        results2 = await EcRepository.get(rld.shortId(), null, null, repo);
        assert.equal(results2, null);
        results2 = await EcRepository.get(rld2.shortId(), null, null, repo);
        assert.equal(results2, null);
        results2 = await EcRepository.get(rld3.shortId(), null, null, repo);
        assert.equal(results2, null);
        results2 = await EcRepository.get(rld4.shortId(), null, null, repo);
        assert.equal(results2, null);
        results2 = await EcRepository.get(rld5.shortId(), null, null, repo);
        assert.equal(results2, null);
        results2 = await EcRepository.get(rld6.shortId(), null, null, repo);
        assert.equal(results2, null);
    });
    it('Turn off caching', async () => {
        EcRepository.caching = false;
        EcRepository.cachingL2 = false;
    });
});