require('../../index.js');
const chai = require('chai');
const sinon = require('sinon');
const EcRemote = require('../com/eduworks/ec/remote/EcRemote.js');
const EcIdentityManager = require('../org/cassproject/ebac/identity/EcIdentityManager.js');
const EcIdentity = require('../org/cassproject/ebac/identity/EcIdentity.js');
const EcContact = require('../org/cassproject/ebac/identity/EcContact.js');
const OAuth2 = require('../org/cassproject/ebac/identity/remote/OAuth2FileBasedRemoteIdentityManager.js');

const assert = chai.assert;

const PEM = "-----BEGIN RSA PRIVATE KEY-----MIIEpAIBAAKCAQEAz4BiFucFE9bNcKfGD+e6aPRHl402YM4Z6nrurDRNlnwsWpsCoZasPLkjC314pVtHAI2duZo+esGKDloBsiLxASRJo3R2XiXVh2Y8U1RcHA5mWL4tMG5UY2d0libpNEHbHPNBmooVYpA2yhxN/vGibIk8x69uZWxJcFOxOg6zWG8EjF8UMgGnRCVSMTY3THhTlfZ0cGUzvrfb7OvHUgdCe285XkmYkj/V9P/m7hbWoOyJAJSTOm4/s6fIKpl72lblfN7bKaxTCsJp6/rQdmUeo+PIaa2lDOfo7dWbuTMcqkZ93kispNfYYhsEGUGlCsrrVWhlve8MenO4GdLsFP+HRwIDAQABAoIBAGaQpOuBIYde44lNxJ7UAdYi+Mg2aqyK81Btl0/TQo6hriLTAAfzPAt/z4y8ZkgFyCDD3zSAw2VWCPFzF+d/UfUohKWgyWlb9iHJLQRbbHQJwhkXV6raviesWXpmnVrROocizkie/FcNxac9OmhL8+cGJt7lHgJP9jTpiW6TGZ8ZzM8KBH2l80x9AWdvCjsICuPIZRjc706HtkKZzTROtq6Z/F4Gm0uWRnwAZrHTRpnh8qjtdBLYFrdDcUoFtzOM6UVRmocTfsNe4ntPpvwY2aGTWY7EmTj1kteMJ+fCQFIS+KjyMWQHsN8yQNfD5/j2uv6/BdSkO8uorGSJT6DwmTECgYEA8ydoQ4i58+A1udqA+fujM0Zn46++NTehFe75nqIt8rfQgoduBam3lE5IWj2U2tLQeWxQyr1ZJkLbITtrAI3PgfMnuFAii+cncwFo805Fss/nbKx8K49vBuCEAq3MRhLjWy3ZvIgUHj67jWvl50dbNqc7TUguxhS4BxGr/cPPkP0CgYEA2nbJPGzSKhHTETL37NWIUAdU9q/6NVRISRRXeRqZYwE1VPzs2sIUxA8zEDBHX7OtvCKzvZy1Lg5Unx1nh4nCEVkbW/8npLlRG2jOcZJF6NRfhzwLz3WMIrP6j9SmjJaB+1mnrTjfsg36tDEPDjjJLjJHCx9z/qRJh1v4bh4aPpMCgYACG31T2IOEEZVlnvcvM3ceoqWT25oSbAEBZ6jSLyWmzOEJwJK7idUFfAg0gAQiQWF9K+snVqzHIB02FIXA43nA7pKRjmA+RiqZXJHEShFgk1y2HGiXGA8mSBvcyhTTJqbBy4vvjl5eRLzrZNwBPSUVPC3PZajCHrvZk9WhxWivIQKBgQCzCu1MH2dy4R7ZlqsIJ8zKweeJMZpfQI7pjclO0FTrhh7+Yzd+5db9A/P2jYrBTVHSwaILgTYf49DIguHJfEZXz26TzB7iapqlWxTukVHISt1ryPNo+E58VoLAhChnSiaHJ+g7GESE+d4A9cAACNwgh0YgQIvhIyW70M1e+j7KDwKBgQDQSBLFDFmvvTP3sIRAr1+0OZWd1eRcwdhs0U9GwootoCoUP/1Y64pqukT6B9oIB/No9Nyn8kUX3/ZDtCslaGKEUGMJXQ4hc5J+lq0tSi9ZWBdhqOuMPEfUF3IxW+9yeILP4ppUBn1m5MVOWg5CvuuEeCmy4bhMaUErUlHZ78t5cA==-----END RSA PRIVATE KEY-----";

// A synchronous stand-in for hello.js: api() answers from `routes` and records each request.
function fakeHello(routes = {}) {
    const hello = {
        calls: [],
        handlers: {},
        failures: [],
        init: sinon.spy(),
        logout: sinon.spy(),
        getAuthResponse: sinon.stub().returns({ access_token: 'TOKEN' }),
        on(event, cb) { hello.handlers[event] = cb; },
        login(server, o) {
            hello.calls.push(['login', server, o]);
            return { fail(f) { hello.failures.push(['login', f]); } };
        },
        api(path, method, o) {
            hello.calls.push(['api', path, method, o]);
            const response = routes[method + ' ' + path];
            return {
                then(cb) {
                    cb(typeof response === 'function' ? response(o) : response);
                    return { fail(f) { hello.failures.push([path, f]); } };
                },
            };
        },
    };
    return hello;
}

const saved = {};
function setGlobal(name, value) {
    if (!(name in saved)) saved[name] = { had: name in global, value: global[name] };
    global[name] = value;
}
function restoreGlobals() {
    for (const [name, s] of Object.entries(saved)) {
        if (s.had) global[name] = s.value;
        else delete global[name];
        delete saved[name];
    }
}

function waitFor(fn) {
    return new Promise((resolve, reject) => {
        let n = 0;
        const check = () => {
            if (fn()) resolve();
            else if (n++ > 200) reject(new Error('timed out'));
            else setTimeout(check, 5);
        };
        check();
    });
}

function manager(hello) {
    setGlobal('hello', hello);
    sinon.stub(EcRemote, 'getExpectingObject');
    const m = new OAuth2();
    EcRemote.getExpectingObject.restore();
    return m;
}

describe('OAuth2FileBasedRemoteIdentityManager', () => {
    afterEach(() => {
        sinon.restore();
        restoreGlobals();
    });

    describe('constructor', () => {
        const config = { googleScope: 'files', nested: { a: [1, 2] } };
        function construct(hello, respond) {
            setGlobal('hello', hello);
            const get = sinon.stub(EcRemote, 'getExpectingObject').callsFake(respond);
            const m = new OAuth2();
            assert.deepEqual(get.firstCall.args.slice(0, 2), ['', 'hello.json']);
            return m;
        }
        it('loads hello.json, keeps a copy of it and calls initialized()', () => {
            const hello = fakeHello();
            const initialized = sinon.spy();
            setGlobal('initialized', initialized);
            const m = construct(hello, (s, svc, ok) => ok(config));
            assert.deepEqual(m.configuration, config);
            assert.notStrictEqual(m.configuration, config);
            assert.notStrictEqual(m.configuration.nested, config.nested);
            assert.strictEqual(hello.init.firstCall.args[0], config);
            assert.isTrue(m.oauthEnabled);
            assert.equal(initialized.callCount, 1);
            assert.isFalse(OAuth2.oauthEnabled);
        });
        it('disables OAuth when initialized() is missing', () => {
            const hello = fakeHello();
            setGlobal('initialized', undefined);
            delete global.initialized;
            const m = construct(hello, (s, svc, ok) => ok(config));
            assert.deepEqual(m.configuration, config);
            assert.equal(hello.init.callCount, 1);
            assert.isFalse(m.oauthEnabled);
        });
        it('disables OAuth when hello.init throws', () => {
            const hello = fakeHello();
            hello.init = sinon.stub().throws(new Error('bad config'));
            const initialized = sinon.spy();
            setGlobal('initialized', initialized);
            const m = construct(hello, (s, svc, ok) => ok('just text'));
            assert.equal(m.configuration, 'just text');
            assert.isFalse(m.oauthEnabled);
            assert.equal(initialized.callCount, 0);
        });
        it('disables OAuth when hello.json cannot be loaded', () => {
            const m = construct(fakeHello(), (s, svc, ok, fail) => fail('404'));
            assert.isNull(m.configuration);
            assert.isFalse(m.oauthEnabled);
        });
    });

    describe('simple members', () => {
        it('isGlobal, configureFromServer, clear, setDefaultIdentityManagementServer and changePassword', () => {
            const hello = fakeHello();
            const m = manager(hello);
            assert.isTrue(m.isGlobal());
            m.global = false;
            assert.isFalse(m.isGlobal());
            const success = sinon.spy();
            m.configureFromServer(success, null);
            assert.deepEqual(success.firstCall.args, [null]);
            OAuth2.oauthEnabled = true;
            m.clear();
            assert.isFalse(OAuth2.oauthEnabled);
            assert.equal(hello.logout.callCount, 0);
            m.setDefaultIdentityManagementServer('google');
            assert.equal(m.server, 'google');
            m.clear();
            assert.deepEqual(hello.logout.firstCall.args, ['google', null]);
            assert.isFalse(m.changePassword('a', 'b', 'c'));
        });
    });

    for (const method of ['fetch', 'create']) {
        describe(method, () => {
            function start(folders) {
                const hello = fakeHello({ 'get google/me/folders': { data: folders } });
                const m = manager(hello);
                m.server = 'google';
                m.configuration = { googleScope: 'drive' };
                for (const name of ['hookIdentityManagerIdentities', 'readIdentityFiles', 'hookIdentityManagerContacts', 'readContactFiles', 'createIdentityFolder', 'createContactFolder'])
                    sinon.stub(m, name);
                const success = () => { };
                const failure = () => { };
                m[method](success, failure);
                return { hello, m, success, failure };
            }
            it('logs in and reads the CASS folders', () => {
                const { hello, m, success, failure } = start([
                    { name: 'CASS Identities', id: 'I' }, { name: 'Other', id: 'X' }, { name: 'CASS Contacts', id: 'C' },
                ]);
                const expected = method == 'fetch' ? { scope: 'drive', display: 'page' } : { scope: 'drive' };
                assert.deepEqual(hello.calls[0], ['login', 'google', expected]);
                assert.strictEqual(hello.failures[0][1], failure);
                const response = { network: 'google' };
                hello.handlers['auth.login'](response);
                assert.strictEqual(m.oauthLoginResponse, response);
                assert.equal(m.network, 'google');
                assert.deepEqual(hello.calls[1], ['api', 'google/me/folders', 'get', {}]);
                assert.deepEqual(m.hookIdentityManagerIdentities.firstCall.args, ['I']);
                assert.deepEqual(m.readIdentityFiles.firstCall.args, ['I', success, failure]);
                assert.deepEqual(m.hookIdentityManagerContacts.firstCall.args, ['C']);
                assert.deepEqual(m.readContactFiles.firstCall.args, ['C', success, failure]);
                assert.equal(m.createIdentityFolder.callCount, 0);
                assert.equal(m.createContactFolder.callCount, 0);
                assert.deepEqual(hello.failures[1], ['google/me/folders', failure]);
            });
            it('creates missing folders', () => {
                const { hello, m, success } = start([]);
                hello.handlers['auth.login']({ network: 'google' });
                assert.deepEqual(m.createIdentityFolder.firstCall.args, [success]);
                assert.equal(m.createContactFolder.callCount, 1);
                assert.equal(m.readIdentityFiles.callCount, 0);
            });
        });
    }

    describe('folders', () => {
        it('createContactFolder posts the folder and hooks contacts to it', () => {
            const hello = fakeHello({ 'post net/me/folders': { id: 'NEW' } });
            const m = manager(hello);
            m.network = 'net';
            sinon.stub(m, 'hookIdentityManagerContacts');
            m.createContactFolder();
            assert.deepEqual(hello.calls[0], ['api', 'net/me/folders', 'post', { name: 'CASS Contacts' }]);
            assert.deepEqual(m.hookIdentityManagerContacts.firstCall.args, ['NEW']);
        });
        it('createIdentityFolder posts the folder, hooks identities and reports success', () => {
            const r = { id: 'NEW' };
            const hello = fakeHello({ 'post net/me/folders': r });
            const m = manager(hello);
            m.network = 'net';
            sinon.stub(m, 'hookIdentityManagerIdentities');
            const success = sinon.spy();
            m.createIdentityFolder(success);
            assert.deepEqual(hello.calls[0], ['api', 'net/me/folders', 'post', { name: 'CASS Identities' }]);
            assert.deepEqual(m.hookIdentityManagerIdentities.firstCall.args, ['NEW']);
            assert.strictEqual(success.firstCall.args[0], r);
        });
    });

    describe('writing files', () => {
        it('writeIdentityFiles writes each identity and then reports success', async () => {
            const m = manager(fakeHello());
            const eim = new EcIdentityManager();
            eim.ids.push({ n: 1 }, { n: 2 });
            sinon.stub(m, 'writeIdentityFile').callsFake((folder, identity, done) => done());
            let result = null;
            m.writeIdentityFiles('F', (r) => { result = r; }, eim);
            await waitFor(() => result != null);
            assert.strictEqual(result, eim.ids);
            assert.deepEqual(m.writeIdentityFile.getCalls().map((c) => [c.args[0], c.args[1].n]), [['F', 1], ['F', 2]]);
        });
        it('writeIdentityFile posts new files and puts known ones', () => {
            const hello = fakeHello({ 'post net/me/files': { id: 'ID1' }, 'put net/me/files': { id: 'ID2' } });
            const m = manager(hello);
            m.network = 'net';
            setGlobal('stringToFile', (content, name, type) => ({ content, name, type }));
            const identity = { ppk: { toPem: () => 'PEM' }, displayName: 'Me' };
            const done = sinon.spy();
            m.writeIdentityFile('F', identity, done);
            const o = hello.calls[0][3];
            assert.deepEqual(hello.calls[0].slice(0, 3), ['api', 'net/me/files', 'post']);
            assert.equal(o.parent, 'F');
            assert.equal(o.name, 'Me.pem');
            assert.deepEqual(o.file, [{ content: 'PEM', name: 'Me.pem', type: 'text/plain' }]);
            assert.equal(identity.id, 'ID1');
            assert.equal(done.callCount, 1);
            m.writeIdentityFile('F', identity, null);
            assert.equal(hello.calls[1][2], 'put');
            assert.notProperty(hello.calls[1][3], 'parent');
            assert.equal(hello.calls[1][3].id, 'ID1');
            assert.equal(identity.id, 'ID2');
        });
        it('writeContactFiles writes each contact', () => {
            const m = manager(fakeHello());
            const eim = new EcIdentityManager();
            const a = {}, b = {};
            eim.contacts.push(a, b);
            sinon.stub(m, 'writeContactFile');
            m.writeContactFiles('F', eim);
            assert.deepEqual(m.writeContactFile.getCalls().map((c) => c.args), [['F', a], ['F', b]]);
        });
        it('writeContactFile posts new files and puts known ones', () => {
            const hello = fakeHello({ 'post net/me/files': { id: 'ID1' }, 'put net/me/files': { id: 'ID2' } });
            const m = manager(hello);
            m.network = 'net';
            setGlobal('stringToFile', (content, name, type) => ({ content, name, type }));
            const c = { pk: { toPem: () => 'PK' }, displayName: 'You' };
            m.writeContactFile('F', c);
            assert.equal(hello.calls[0][2], 'post');
            assert.equal(hello.calls[0][3].parent, 'F');
            assert.deepEqual(hello.calls[0][3].file, [{ content: 'PK', name: 'You.pem', type: 'text/plain' }]);
            assert.equal(c.id, 'ID1');
            m.writeContactFile('F', c);
            assert.equal(hello.calls[1][2], 'put');
            assert.equal(c.id, 'ID2');
        });
    });

    describe('reading files', () => {
        const files = { data: [
            { name: 'Bob.pem.pem', id: '1', downloadUrl: 'http://dl/1?x=1' },
            { name: 'x\\.pemy.pem', id: '2', downloadUrl: 'http://dl/2?x=2' },
        ] };
        it('readIdentityFiles downloads each key into the identity manager', async () => {
            const hello = fakeHello({ 'get net/me/files': files });
            const m = manager(hello);
            m.network = 'net';
            const pk = EcPpk.fromPem(PEM);
            const get = sinon.stub(EcRemote, 'getExpectingString').callsFake((s, url, ok) => ok(PEM));
            const eim = new EcIdentityManager();
            let result = null;
            m.readIdentityFiles('F', (r) => { result = r; }, null, eim);
            assert.deepEqual(hello.calls[0], ['api', 'net/me/files', 'get', { parent: 'F' }]);
            await waitFor(() => result != null);
            assert.strictEqual(result, eim);
            assert.deepEqual(get.getCalls().map((c) => c.args[1]), ['http://dl/1?x=1&access_token=TOKEN', 'http://dl/2?x=2&access_token=TOKEN']);
            assert.equal(hello.getAuthResponse.firstCall.args[0], 'net');
            assert.equal(eim.ids.length, 1);
            assert.instanceOf(eim.ids[0], EcIdentity);
            assert.equal(eim.ids[0].displayName, 'Bob.pem');
            assert.equal(eim.ids[0].source, 'google');
            assert.equal(eim.ids[0].id, '1');
            assert.strictEqual(eim.ids[0].ppk, pk);
        });
        it('readIdentityFiles strips the literal "\\.pem" text from names', async () => {
            const hello = fakeHello({ 'get net/me/files': { data: [files.data[1]] } });
            const m = manager(hello);
            m.network = 'net';
            sinon.stub(EcRemote, 'getExpectingString').callsFake((s, url, ok) => ok(PEM));
            const eim = new EcIdentityManager();
            let result = null;
            m.readIdentityFiles('F', (r) => { result = r; }, null, eim);
            await waitFor(() => result != null);
            assert.equal(eim.ids[0].displayName, 'xy');
        });
        it('readContactFiles downloads each key into the contacts', async () => {
            const hello = fakeHello({ 'get net/me/files': files });
            const m = manager(hello);
            m.network = 'net';
            const failure = () => { };
            const pkPem = EcPpk.fromPem(PEM).toPk().toPem();
            const get = sinon.stub(EcRemote, 'getExpectingString').callsFake((s, url, ok) => ok(pkPem));
            const eim = new EcIdentityManager();
            let done = false;
            m.readContactFiles('F', (r) => { done = r === null; }, failure, eim);
            await waitFor(() => done);
            assert.strictEqual(get.firstCall.args[3], failure);
            assert.equal(eim.contacts.length, 1);
            assert.instanceOf(eim.contacts[0], EcContact);
            // Both files hold the same key, so the second renames the first.
            assert.equal(eim.contacts[0].displayName, 'xy');
            assert.equal(eim.contacts[0].source, 'google');
            assert.equal(eim.contacts[0].id, '1');
        });
        it('read reports success at once when the folder is empty', () => {
            const hello = fakeHello({ 'get net/me/files': { data: [] } });
            const m = manager(hello);
            m.network = 'net';
            const eim = new EcIdentityManager();
            const s1 = sinon.spy(), s2 = sinon.spy();
            m.readIdentityFiles('F', s1, null, eim);
            m.readContactFiles('F', s2, null, eim);
            assert.strictEqual(s1.firstCall.args[0], eim);
            assert.deepEqual(s2.firstCall.args, [null]);
        });
    });

    describe('hooks', () => {
        it('hookIdentityManagerIdentities writes changed identities to the folder', () => {
            const m = manager(fakeHello());
            sinon.stub(m, 'writeIdentityFile');
            const eim = new EcIdentityManager();
            m.hookIdentityManagerIdentities('F', eim);
            const who = {};
            eim.onIdentityChanged(who);
            assert.deepEqual(m.writeIdentityFile.firstCall.args, ['F', who, null]);
        });
        it('hookIdentityManagerContacts writes changed contacts to the folder', () => {
            const m = manager(fakeHello());
            sinon.stub(m, 'writeContactFile');
            const eim = new EcIdentityManager();
            m.hookIdentityManagerContacts('F', eim);
            const who = {};
            eim.onContactChanged(who);
            assert.deepEqual(m.writeContactFile.firstCall.args, ['F', who]);
        });
    });

    describe('commit', () => {
        it('fails without a login', () => {
            const hello = fakeHello();
            hello.getAuthResponse.returns(null);
            const m = manager(hello);
            m.server = 'google';
            const failure = sinon.spy();
            m.commit(null, failure);
            assert.deepEqual(failure.firstCall.args, ['Please login again.']);
            assert.equal(hello.calls.length, 0);
        });
        it('writes identities and contacts into their folders', () => {
            const hello = fakeHello({ 'get net/me/folders': { data: [
                { name: 'CASS Contacts', id: 'C' }, { name: 'Junk', id: 'J' }, { name: 'CASS Identities', id: 'I' },
            ] } });
            const m = manager(hello);
            m.server = 'google';
            m.network = 'net';
            sinon.stub(m, 'writeIdentityFiles');
            sinon.stub(m, 'writeContactFiles');
            const success = () => { };
            const failure = () => { };
            m.commit(success, failure);
            assert.equal(hello.getAuthResponse.firstCall.args[0], 'google');
            assert.deepEqual(hello.calls[0], ['api', 'net/me/folders', 'get', { network: 'net' }]);
            assert.deepEqual(m.writeIdentityFiles.firstCall.args, ['I', success]);
            assert.deepEqual(m.writeContactFiles.firstCall.args, ['C']);
            assert.equal(m.writeIdentityFiles.callCount, 1);
            assert.deepEqual(hello.failures[0], ['net/me/folders', failure]);
        });
    });
});
