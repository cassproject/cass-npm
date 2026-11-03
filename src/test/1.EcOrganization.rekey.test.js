require('../../index.js');
const chai = require('chai');
const EcOrganization = require('../org/schema/EcOrganization.js');
const EcPpk = require('../com/eduworks/ec/crypto/EcPpk.js');
const EcIdentity = require('../org/cassproject/ebac/identity/EcIdentity.js');
const EcIdentityManager = require('../org/cassproject/ebac/identity/EcIdentityManager.js');
const EcEncryptedValue = require('../org/cassproject/ebac/repository/EcEncryptedValue.js');

const assert = chai.assert;

describe('EcOrganization.rekeyAndSave', function () {
    this.timeout(60000);
    // rekeyAndSave reads the current key set without passing its eim along, so the
    // owner has to be in the default identity manager.
    const eim = EcIdentityManager.default;
    let org, oldKey, saved, owner;
    const repo = {
        selectedServer: 'https://localhost/api/',
        saveTo: async (o, success) => {
            saved.push({ id: o.id, keySet: JSON.parse(JSON.stringify(o[EcOrganization.ORG_PPK_SET_KEY] ?? null)) });
            if (success) await success();
        }
    };

    before(async () => {
        owner = new EcIdentity();
        owner.ppk = await EcPpk.generateKeyAsync();
        eim.addIdentity(owner);
        oldKey = await EcPpk.generateKeyAsync();
        org = new EcOrganization();
        org.generateId(repo.selectedServer);
        org.addOwner(owner.ppk.toPk());
        org[EcOrganization.ORG_PPK_SET_KEY] = await EcEncryptedValue.encryptValue(
            org.ppkListToPemArrayString([oldKey]), EcOrganization.ORG_PPK_SET_KEY, org.owner, org.reader);
        saved = [];
        await org.rekeyAndSave(null, null, repo, eim);
        // Give any work the method left running a chance to finish before checking.
        await new Promise((resolve) => setTimeout(resolve, 500));
    });

    after(() => {
        eim.ids = eim.ids.filter((i) => i !== owner && i.displayName !== 'Organization Rekey New Key');
    });

    it('saves the organization, then the rekey request', () => {
        assert.equal(saved.length, 2);
        assert.equal(saved[0].id, org.id);
        assert.notEqual(saved[1].id, org.id);
    });

    it('saves the key set encrypted', () => {
        assert.isFalse(Array.isArray(saved[0].keySet), 'saved a plaintext key list');
        assert.equal(saved[0].keySet['@type'] ?? saved[0].keySet.type, 'EncryptedValue');
    });

    it('keeps the key set encrypted afterwards', () => {
        const keySet = org[EcOrganization.ORG_PPK_SET_KEY];
        assert.isFalse(Array.isArray(keySet), 'key set was replaced by a plaintext key list');
        assert.equal(keySet['@type'] ?? keySet.type, 'EncryptedValue');
    });

    it('adds the new key after the old one', async () => {
        const keys = await org.getOrgKeys(eim);
        assert.equal(keys.length, 2);
        assert.equal(keys[0].toPem(), oldKey.toPem());
        assert.isTrue(eim.ids.some((i) => i.ppk.toPem() === keys[1].toPem()), 'new key is not the one added to the identity manager');
    });
});
