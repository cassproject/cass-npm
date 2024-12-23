let chai = require('chai');
const EcAes = require('../com/eduworks/ec/crypto/EcAes');
const EcPpk = require('../com/eduworks/ec/crypto/EcPpk');
const EcRemoteIdentityManager = require('../org/cassproject/ebac/identity/remote/EcRemoteIdentityManager');
const EcIdentityManager = require('../org/cassproject/ebac/identity/EcIdentityManager');
const EcIdentity = require('../org/cassproject/ebac/identity/EcIdentity');

let assert = chai.assert;

describe('SkyID Adapter', function() {
    this.timeout(30000);
    let username = EcAes.newIv(6);
    let password = EcAes.newSecret(6);
    let newPassword = EcAes.newSecret(6);
    let name = 'Test User';
    let ident = null;
    if ((typeof Cypress !== 'undefined') && Cypress != null && Cypress.env != null)
        process.env.CASS_LOOPBACK = Cypress.env('CASS_LOOPBACK');
    console.log(process.env.CASS_LOOPBACK);

    it('create user', async () => {
        let rld = new EcRemoteIdentityManager();
        rld.server = process.env.CASS_LOOPBACK || 'http://localhost/api/';
        await rld.configureFromServer(null, null);
        rld.startLogin(username, password);
        let im = new EcIdentityManager();
        await rld.create(null, null, im);
        im = await rld.fetch();
        ident = new EcIdentity();
        ident.ppk = await EcPpk.generateKeyAsync(null, null);
        ident.displayName = name;
        im.addIdentity(ident);
        await rld.commit(null, null, im);
    }).timeout(30000);

    it('change password', async () => {
        let rld = new EcRemoteIdentityManager();
        rld.server = process.env.CASS_LOOPBACK || 'http://localhost/api/';
        await rld.configureFromServer(null, null);
        rld.startLogin(username, password);
        let im = await rld.fetch();
        assert.equal(im.ids[0].ppk.toPem(), ident.ppk.toPem());
        rld.changePassword(username, password, newPassword);
        await rld.commit(null, null, im);
    }).timeout(30000);

    it('load user', async () => {
        let rld = new EcRemoteIdentityManager();
        rld.server = process.env.CASS_LOOPBACK || 'http://localhost/api/';
        await rld.configureFromServer(null, null);
        rld.startLogin(username, newPassword);
        let im = await rld.fetch();
        assert.equal(im.ids[0].ppk.toPem(), ident.ppk.toPem());
    }).timeout(30000);
});
