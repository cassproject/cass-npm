require('../../index.js');
const chai = require('chai');
const sinon = require('sinon');
const forge = require('node-forge');
const { cassPromisify } = require('../com/eduworks/ec/promises/helpers.js');
const EcRemote = require('../com/eduworks/ec/remote/EcRemote.js');
const EcRemoteIdentityManager = require('../org/cassproject/ebac/identity/remote/EcRemoteIdentityManager.js');
const EcIdentityManager = require('../org/cassproject/ebac/identity/EcIdentityManager.js');
const EcIdentity = require('../org/cassproject/ebac/identity/EcIdentity.js');
const EcContact = require('../org/cassproject/ebac/identity/EcContact.js');

const assert = chai.assert;

const SALTS = {
    usernameSalt: 'u'.repeat(16), usernameIterations: 1000.7, usernameLength: 64,
    passwordSalt: 'p'.repeat(16), passwordIterations: 1000, passwordLength: 64,
    secretSalt: 's'.repeat(16), secretIterations: 1000,
    signatureSheetHashAlgorithm: 'SHA-256',
};

function serverReturns(payload) {
    return (server, service, s, f) => cassPromisify(Promise.resolve(payload), s, f);
}
function postReturns(payload) {
    return (server, service, fd, s, f) => cassPromisify(Promise.resolve(payload), s, f);
}
function loggedIn() {
    const rim = new EcRemoteIdentityManager();
    rim.server = 'http://id/';
    rim.configure('u'.repeat(16), 2, 16, 'p'.repeat(16), 2, 16, 's'.repeat(16), 2);
    rim.startLogin('user', 'pass');
    return rim;
}
const fakeIdentity = (name, ppk) => Object.assign(new EcIdentity(), { displayName: name, ppk });
const fakeContact = (name, pk) => Object.assign(new EcContact(), { displayName: name, pk });
const fakePpk = (n) => ({ toPem: () => 'PPK' + n, toPk: () => ({ toPem: () => 'PK' + n }) });
const fakePk = (n) => ({ toPem: () => 'PK' + n });
const isNode = typeof process !== 'undefined' && process.versions?.node != null && typeof window === 'undefined';

// EcIdentityManager.addContact saves contacts to localStorage without a guard.
let createdStorage = false;
let usingStorage = false;
let savedContacts;
function useStorage() {
    usingStorage = true;
    if (typeof localStorage === 'undefined') {
        global.localStorage = {};
        createdStorage = true;
    }
    savedContacts = localStorage["contacts"];
}
function restoreStorage() {
    if (!usingStorage) return;
    usingStorage = false;
    if (createdStorage) delete global.localStorage;
    else if (savedContacts === undefined) delete localStorage["contacts"];
    else localStorage["contacts"] = savedContacts;
    createdStorage = false;
}

describe('EcRemoteIdentityManager flows', () => {
    afterEach(() => sinon.restore());

    describe('configureFromServer', () => {
        it('reads salts and iterations from the server', async () => {
            const get = sinon.stub(EcRemote, 'getExpectingObject').callsFake(serverReturns(SALTS));
            const rim = new EcRemoteIdentityManager();
            rim.server = 'http://id/';
            const r = await rim.configureFromServer();
            assert.strictEqual(r, SALTS);
            assert.deepEqual(get.firstCall.args.slice(0, 2), ['http://id/', 'sky/id/salts']);
            assert.isTrue(rim.configured);
            assert.equal(rim.usernameIterations, 1000);
            assert.equal(rim.usernameWidth, 64);
            assert.equal(rim.passwordSalt, 'p'.repeat(16));
            assert.equal(rim.secretIterations, 1000);
            assert.equal(rim.signatureSheetHashAlgorithm, 'SHA-256');
        });
        const bad = [
            ['usernameSalt', 'short', 'Insufficient length on Username Salt'],
            ['usernameIterations', 999, 'Insufficient iterations on Username Hash'],
            ['usernameLength', 32, 'Username Hash required to be length 64.'],
            ['passwordSalt', 'short', 'Insufficient length on Password Salt'],
            ['passwordIterations', 999, 'Insufficient iterations on Password Hash'],
            ['passwordLength', 32, 'Password Hash required to be length 64.'],
            ['secretSalt', 'short', 'Insufficient length on Secret Salt'],
            ['secretIterations', 999, 'Insufficient iterations on Secret Hash'],
        ];
        for (const [field, value, message] of bad) {
            it('rejects weak ' + field, async () => {
                sinon.stub(EcRemote, 'getExpectingObject').callsFake(serverReturns({ ...SALTS, [field]: value }));
                const rim = new EcRemoteIdentityManager();
                const e = await rim.configureFromServer().catch((x) => x);
                assert.instanceOf(e, Error);
                assert.equal(e.message, message);
                assert.isFalse(rim.configured);
            });
        }
        it('marks itself unconfigured when the server fails', async () => {
            sinon.stub(EcRemote, 'getExpectingObject').callsFake((server, service, s, f) => cassPromisify(Promise.reject('down'), s, f));
            const rim = new EcRemoteIdentityManager();
            rim.configured = true;
            let failed = null;
            await rim.configureFromServer(null, (e) => { failed = e; });
            assert.instanceOf(failed, Error);
            assert.equal(failed.message, 'down');
            assert.isFalse(rim.configured);
        });
    });

    describe('fetch', () => {
        beforeEach(useStorage);
        afterEach(restoreStorage);
        (isNode ? it : it.skip)('fails on contacts in Node when there is no localStorage', async () => {
            restoreStorage();
            const rim = loggedIn();
            sinon.stub(EcRemote, 'postExpectingObject').callsFake(postReturns({ contacts: [{ k: 1 }] }));
            sinon.stub(EcContact, 'fromEncryptedContact').returns(fakeContact('k', fakePk(1)));
            const e = await rim.fetch().catch((x) => x);
            assert.instanceOf(e, ReferenceError);
            assert.match(e.message, /localStorage/);
        });
        it('fails when not configured or not logged in', () => {
            const failure = sinon.spy();
            const rim = new EcRemoteIdentityManager();
            assert.isUndefined(rim.fetch(null, failure));
            assert.equal(failure.firstCall.args[0], 'Remote Identity not configured.');
            rim.configured = true;
            assert.isUndefined(rim.fetch(null, failure));
            assert.equal(failure.secondCall.args[0], 'Please log in before performing this operation.');
        });
        it('builds an identity manager from the credentials and contacts', async () => {
            const rim = loggedIn();
            const post = sinon.stub(EcRemote, 'postExpectingObject').callsFake(postReturns({
                pad: 'PAD', token: 'TOKEN', lastLogin: 42,
                credentials: [{ c: 1 }, { c: 2 }],
                contacts: [{ k: 1 }],
            }));
            const fromCredential = sinon.stub(EcIdentity, 'fromCredential').callsFake(async (c) => fakeIdentity('id' + c.c, fakePpk(c.c)));
            const fromContact = sinon.stub(EcContact, 'fromEncryptedContact').callsFake((c) => fakeContact('k' + c.k, fakePk(10 + c.k)));
            const commit = sinon.stub(rim, 'commit').resolves('committed');
            let seen = null;
            const eim = await rim.fetch((x) => { seen = x; return x; }, null);
            assert.strictEqual(seen, eim);
            assert.instanceOf(eim, EcIdentityManager);
            assert.deepEqual(post.firstCall.args.slice(0, 2), ['http://id/', 'sky/id/login']);
            const request = JSON.parse(post.firstCall.args[2].get('credentialRequest'));
            assert.equal(request.username, rim.usernameWithSalt);
            assert.equal(request.password, rim.passwordWithSalt);
            assert.equal(rim.pad, 'PAD');
            assert.equal(rim.token, 'TOKEN');
            assert.deepEqual(eim.ids.map((i) => i.displayName), ['id1', 'id2']);
            assert.deepEqual(eim.ids.map((i) => i.lastLogin), [42, 42]);
            assert.deepEqual(eim.contacts.map((i) => i.displayName), ['k1']);
            assert.deepEqual(fromCredential.firstCall.args, [{ c: 1 }, rim.secretWithSalt, 'http://id/']);
            assert.deepEqual(fromContact.firstCall.args, [{ k: 1 }, rim.secretWithSalt, 'http://id/']);
            assert.equal(commit.callCount, 0);
        });
        it('retries with the empty-password secret and then commits', async () => {
            const rim = loggedIn();
            const report = sinon.stub(global.auditLogger, 'report');
            sinon.stub(EcRemote, 'postExpectingObject').callsFake(postReturns({
                credentials: [{ c: 1 }, { c: 2 }], contacts: [{ k: 1 }, { k: 2 }],
            }));
            const alt = forge.util.encode64(forge.pkcs5.pbkdf2('', rim.secretSalt, rim.secretIterations, 32));
            const fromCredential = sinon.stub(EcIdentity, 'fromCredential').callsFake(async (c, secret) => {
                if (secret == alt) return fakeIdentity('alt' + c.c, fakePpk(c.c));
                if (c.c == 1) throw new Error('bad secret');
                return fakeIdentity('noKey', null);
            });
            const fromContact = sinon.stub(EcContact, 'fromEncryptedContact').callsFake((c, secret) => {
                if (secret == alt) return fakeContact('alt' + c.k, fakePk(10 + c.k));
                if (c.k == 1) throw new Error('bad contact');
                return null;
            });
            const commit = sinon.stub(rim, 'commit').resolves('committed');
            const eim = await rim.fetch();
            assert.deepEqual(eim.ids.map((i) => i.displayName), ['alt1', 'alt2']);
            assert.deepEqual(eim.contacts.map((i) => i.displayName), ['alt1', 'alt2']);
            assert.equal(fromCredential.callCount, 4);
            assert.equal(fromContact.callCount, 4);
            assert.deepEqual(fromContact.getCall(1).args, [{ k: 1 }, alt, 'http://id/']);
            assert.equal(report.callCount, 2);
            assert.equal(report.firstCall.args[2], 'EcRemoIdenManaFetch');
            assert.equal(report.firstCall.args[3].message, 'bad secret');
            assert.equal(commit.callCount, 1);
            assert.deepEqual(commit.firstCall.args, [null, null, eim]);
        });
        it('commits when only contacts needed the retry', async () => {
            const rim = loggedIn();
            sinon.stub(EcRemote, 'postExpectingObject').callsFake(postReturns({ contacts: [{ k: 1 }] }));
            const alt = forge.util.encode64(forge.pkcs5.pbkdf2('', rim.secretSalt, rim.secretIterations, 32));
            sinon.stub(EcContact, 'fromEncryptedContact').callsFake((c, secret) => secret == alt ? fakeContact('alt', fakePk(1)) : fakeContact('none', null));
            const commit = sinon.stub(rim, 'commit').resolves();
            const eim = await rim.fetch();
            assert.deepEqual(eim.ids, []);
            assert.equal(eim.contacts.length, 1);
            assert.equal(commit.callCount, 1);
        });
        it('does not commit when nothing needed the retry, even without credentials or contacts', async () => {
            const rim = loggedIn();
            sinon.stub(EcRemote, 'postExpectingObject').callsFake(postReturns({}));
            const commit = sinon.stub(rim, 'commit').resolves();
            const eim = await rim.fetch();
            assert.deepEqual(eim.ids, []);
            assert.deepEqual(eim.contacts, []);
            assert.equal(commit.callCount, 0);
        });
        it('fails when a credential has no key even with the retry', async () => {
            const rim = loggedIn();
            sinon.stub(EcRemote, 'postExpectingObject').callsFake(postReturns({ credentials: [{ c: 1 }] }));
            sinon.stub(EcIdentity, 'fromCredential').resolves(fakeIdentity('none', null));
            let failed = null;
            await rim.fetch(null, (e) => { failed = e; });
            assert.equal(failed.message, 'Could not retreive encrypted ppks from credential packet.');
        });
        it('fails when a contact has no key even with the retry', async () => {
            const rim = loggedIn();
            sinon.stub(EcRemote, 'postExpectingObject').callsFake(postReturns({ contacts: [{ k: 1 }] }));
            sinon.stub(EcContact, 'fromEncryptedContact').returns(fakeContact('none', null));
            const e = await rim.fetch().catch((x) => x);
            assert.equal(e.message, 'Could not retreive encrypted pks from credential packet.');
        });
        it('reports and rethrows a failed login', async () => {
            const rim = loggedIn();
            const report = sinon.stub(global.auditLogger, 'report');
            sinon.stub(EcRemote, 'postExpectingObject').callsFake((server, service, fd, s, f) => cassPromisify(Promise.reject('denied'), s, f));
            const e = await rim.fetch().catch((x) => x);
            assert.instanceOf(e, Error);
            assert.equal(e.message, 'denied');
            assert.deepEqual(report.firstCall.args.slice(2), ['EcRemoIdenManaFetch', 'denied']);
        });
    });

    describe('sendCredentials', () => {
        function fakeEim() {
            const eim = new EcIdentityManager();
            const mine = Object.assign(new EcIdentity(), { source: null });
            const same = Object.assign(new EcIdentity(), { source: 'http://id/' });
            const other = Object.assign(new EcIdentity(), { source: 'http://elsewhere/' });
            sinon.stub(mine, 'toCredential').resolves('cred-mine');
            sinon.stub(same, 'toCredential').resolves('cred-same');
            sinon.stub(other, 'toCredential').resolves('cred-other');
            eim.ids.push(mine, other, same);
            const c1 = Object.assign(new EcContact(), { source: null });
            const c2 = Object.assign(new EcContact(), { source: 'http://elsewhere/' });
            sinon.stub(c1, 'toEncryptedContact').resolves('contact-1');
            sinon.stub(c2, 'toEncryptedContact').resolves('contact-2');
            eim.contacts.push(c2, c1);
            return { eim, mine, other, c1, c2 };
        }
        it('rejects when not configured or not logged in', async () => {
            const rim = new EcRemoteIdentityManager();
            let e = await rim.sendCredentials(null, null, 'svc', new EcIdentityManager()).catch((x) => x);
            assert.equal(e.message, 'Remote Identity not configured.');
            rim.configured = true;
            e = await rim.sendCredentials(null, null, 'svc', new EcIdentityManager()).catch((x) => x);
            assert.equal(e.message, 'Please log in before performing this operation.');
        });
        for (const [method, service] of [['commit', 'sky/id/commit'], ['create', 'sky/id/create']]) {
            it(method + ' posts this server\'s credentials and contacts with a signature sheet', async () => {
                const rim = loggedIn();
                rim.pad = 'PAD';
                rim.token = 'TOKEN';
                rim.signatureSheetHashAlgorithm = 'ALG';
                const { eim, mine, other, c1, c2 } = fakeEim();
                const sheet = sinon.stub(eim, 'signatureSheet').callsFake((d, server, s, f) => cassPromisify(Promise.resolve('SHEET'), s, f));
                const post = sinon.stub(EcRemote, 'postExpectingString').callsFake(postReturns('OK'));
                let seen = null;
                const r = await rim[method]((x) => { seen = x; return 'cb'; }, null, eim);
                assert.equal(r, 'cb');
                assert.equal(seen, 'OK');
                assert.deepEqual(sheet.firstCall.args.slice(0, 2), [60000, 'http://id/']);
                assert.equal(sheet.firstCall.args[4], 'ALG');
                assert.deepEqual(post.firstCall.args.slice(0, 2), ['http://id/', service]);
                const fd = post.firstCall.args[2];
                assert.equal(fd.get('signatureSheet'), 'SHEET');
                const commit = JSON.parse(fd.get('credentialCommit'));
                assert.equal(commit.username, rim.usernameWithSalt);
                assert.equal(commit.password, rim.passwordWithSalt);
                assert.equal(commit.token, 'TOKEN');
                assert.equal(commit.credentials.pad, 'PAD');
                assert.deepEqual(commit.credentials.credentials, ['cred-mine', 'cred-same']);
                assert.deepEqual(commit.credentials.contacts, ['contact-1']);
                assert.equal(mine.source, 'http://id/');
                assert.equal(other.source, 'http://elsewhere/');
                assert.equal(c1.source, 'http://id/');
                assert.equal(c2.source, 'http://elsewhere/');
                assert.equal(mine.toCredential.firstCall.args[0], rim.secretWithSalt);
                assert.equal(c1.toEncryptedContact.firstCall.args[0], rim.secretWithSalt);
                assert.equal(other.toCredential.callCount, 0);
            });
        }
        it('uses the default identity manager when none is given', async () => {
            const rim = loggedIn();
            const { eim } = fakeEim();
            sinon.replace(EcIdentityManager, 'default', eim);
            sinon.stub(eim, 'signatureSheet').callsFake((d, server, s, f) => cassPromisify(Promise.resolve('SHEET'), s, f));
            sinon.stub(EcRemote, 'postExpectingString').callsFake(postReturns('OK'));
            assert.equal(await rim.commit(), 'OK');
            assert.equal(eim.signatureSheet.callCount, 1);
        });
        it('rethrows post failures as errors', async () => {
            const rim = loggedIn();
            const eim = new EcIdentityManager();
            sinon.stub(eim, 'signatureSheet').callsFake((d, server, s, f) => cassPromisify(Promise.resolve('SHEET'), s, f));
            sinon.stub(EcRemote, 'postExpectingString').callsFake((server, service, fd, s, f) => cassPromisify(Promise.reject('nope'), s, f));
            const e = await rim.commit(null, null, eim).catch((x) => x);
            assert.instanceOf(e, Error);
            assert.equal(e.message, 'nope');
        });
        it('rethrows signature sheet failures as errors', async () => {
            const rim = loggedIn();
            const eim = new EcIdentityManager();
            sinon.stub(eim, 'signatureSheet').callsFake((d, server, s, f) => cassPromisify(Promise.reject('nosheet'), s, f));
            const e = await rim.commit(null, null, eim).catch((x) => x);
            assert.equal(e.message, 'nosheet');
        });
    });

    it('splicePasswords interleaves any number of passwords', () => {
        const rim = new EcRemoteIdentityManager();
        assert.equal(rim.splicePasswords([]), '');
        assert.equal(rim.splicePasswords(['ab', '', 'wxyz', '1']), 'aw1bxyz');
    });
});
