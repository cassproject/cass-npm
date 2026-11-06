// Pins EcRepository behaviour without a server by stubbing EcRemote and the
// identity manager. Written before refactoring EcRepository for SonarCloud.
require('../../index.js');
const chai = require('chai');
const sinon = require('sinon');
const EcRepository = require('../org/cassproject/ebac/repository/EcRepository.js');
const EcRemote = require('../com/eduworks/ec/remote/EcRemote.js');
const EcRemoteLinkedData = require('../org/cassproject/schema/general/EcRemoteLinkedData.js');
const EcEncryptedValue = require('../org/cassproject/ebac/repository/EcEncryptedValue.js');
const EcCrypto = require('../com/eduworks/ec/crypto/EcCrypto.js');

const assert = chai.assert;

const SERVER = 'https://repo.example/api/';
const NOT_LOCATED = 'Could not locate object. May be due to EcRepository.alwaysTryUrl flag.';
const NOT_FOUND = 'Object not found or you did not supply sufficient permissions to access the object.';

// A fake signer, so nothing needs real keys.
const eim = {
    eimId: 'unit-eim',
    ids: [],
    signatureSheet: async () => '[]',
    sign: async (d) => d
};

function thing(id, name) {
    const t = new EcRemoteLinkedData('https://schema.org/', 'Thing');
    t.id = id;
    if (name) t.name = name;
    return t;
}

function repo(server, fields) {
    return Object.assign({ selectedServer: server, timeOffset: 0, signatureSheetHashAlgorithm: null }, fields);
}

// Settles a promise and reports how, so tests can pin rejections exactly.
async function settle(p) {
    try {
        return { value: await p };
    } catch (e) {
        return { error: e };
    }
}

const STATICS = ['repos', 'alwaysTryUrl', 'unsigned', 'caching', 'cachingL2', 'cachingSearch'];
let saved;
function saveStatics() {
    saved = {};
    for (const s of STATICS) saved[s] = EcRepository[s];
    EcRepository.repos = [];
    EcRepository.alwaysTryUrl = false;
    EcRepository.unsigned = false;
    EcRepository.caching = false;
    EcRepository.cachingL2 = false;
    EcRepository.cachingSearch = false;
}
function restoreStatics() {
    for (const s of STATICS) EcRepository[s] = saved[s];
    EcRepository.clearCache();
    EcRepository.fetching = {};
}

describe('EcRepository (unit)', () => {
    beforeEach(saveStatics);
    afterEach(() => {
        sinon.restore();
        restoreStatics();
    });

    describe('escapeSearch', () => {
        const cases = [
            ['plain', 'plain'],
            ['', ''],
            ['a-b', 'a\\-b'],
            ['a=b', 'a\\=b'],
            ['a&&b', 'a\\&&b'],
            // "||" is escaped, then each "|" is escaped again.
            ['a||b', 'a\\\\|\\|b'],
            ['a|b', 'a\\|b'],
            ['<>', '\\<\\>'],
            ['(x)', '\\(x\\)'],
            ['{x}', '\\{x\\}'],
            ['[x]', '\\[x\\]'],
            ['a^b', 'a\\^b'],
            ['say "hi"', 'say \\"hi\\"'],
            ['~*?', '\\~\\*\\?'],
            ['a:b', 'a\\:b'],
            ['a/b', 'a\\/b'],
            ['a+b', 'a\\+b'],
            ['back\\slash', 'back\\\\slash'],
            ['a--b', 'a\\-\\-b'],
            ['all -=&&||<>|(){}[]^"~*?:/+\\', 'all \\-\\=\\&&\\\\|\\|\\<\\>\\|\\(\\)\\{\\}\\[\\]\\^\\"\\~\\*\\?\\:\\/\\+\\\\']
        ];
        for (const [input, expected] of cases)
            it(`escapes ${JSON.stringify(input)}`, () => {
                assert.strictEqual(EcRepository.escapeSearch(input), expected);
            });
    });

    describe('history', () => {
        beforeEach(() => { EcRepository.unsigned = true; });

        it('rejects bad URLs synchronously', () => {
            assert.throws(() => EcRepository.history(null), 'URL is null. Cannot EcRepository.history');
            assert.throws(() => EcRepository.history('ftp://x'), 'URL does not begin with http. Cannot EcRepository.history');
        });
        it('maps results to EcRemoteLinkedData', async () => {
            sinon.stub(EcRemote, 'getExpectingObject').resolves([{ '@id': 'https://x/1', '@type': 'Thing', '@context': 'https://schema.org/' }]);
            const r = await EcRepository.history('https://x/1', null, eim);
            assert.lengthOf(r, 1);
            assert.instanceOf(r[0], EcRemoteLinkedData);
            assert.equal(r[0].id, 'https://x/1');
            assert.equal(EcRemote.getExpectingObject.firstCall.args[0], 'https://x/1?history=true');
        });
        for (const [name, err] of [['a not-located Error', new Error('x ' + NOT_LOCATED)], ['a not-found string', NOT_FOUND]])
            it(`resolves null for ${name}`, async () => {
                sinon.stub(EcRemote, 'getExpectingObject').rejects(err);
                assert.isNull(await EcRepository.history('https://x/1', null, eim));
            });
        it('rethrows other errors, null and objects without toString', async () => {
            const other = new Error('boom');
            sinon.stub(EcRemote, 'getExpectingObject').returns(Promise.reject(other));
            assert.strictEqual((await settle(EcRepository.history('https://x/1', null, eim))).error, other);
            EcRemote.getExpectingObject.returns(Promise.reject(null));
            const r = await settle(EcRepository.history('https://x/1', null, eim));
            assert.property(r, 'error');
            assert.isNull(r.error);
            const bare = Object.create(null);
            EcRemote.getExpectingObject.returns(Promise.reject(bare));
            assert.strictEqual((await settle(EcRepository.history('https://x/1', null, eim))).error, bare);
        });
    });

    describe('get', () => {
        it('rejects bad URLs', async () => {
            assert.equal((await settle(EcRepository.get(null))).error.message, 'URL is null. Cannot EcRepository.get');
            assert.equal((await settle(EcRepository.get('ftp://x/1'))).error.message, 'URL does not begin with http. Cannot EcRepository.get ftp://x/1');
        });
        it('accepts an upper-case scheme', async () => {
            EcRepository.alwaysTryUrl = true;
            EcRepository.unsigned = true;
            const t = { '@id': 'HTTP://x/api/data/t/1', '@type': 'Thing', '@context': 'https://schema.org/' };
            sinon.stub(EcRemote, 'getExpectingObject').resolves(t);
            const r = await EcRepository.get('HTTP://x/api/data/t/1', null, null, null, eim);
            assert.equal(r.id, 'HTTP://x/api/data/t/1');
        });

        describe('when the URL is not tried directly and there are several repositories', () => {
            beforeEach(() => {
                EcRepository.repos = [repo('https://a.example/api/'), repo('https://b.example/api/')];
            });
            for (const [name, err] of [['not-located', new Error(NOT_LOCATED)], ['not-found', new Error(NOT_FOUND)]])
                it(`resolves null when find rejects with ${name}`, async () => {
                    sinon.stub(EcRepository, 'find').rejects(err);
                    assert.isNull(await EcRepository.get('https://c.example/api/data/x/1', null, null, null, eim));
                    assert.equal(EcRepository.find.firstCall.args[1], NOT_LOCATED);
                });
            it('rethrows other errors from find', async () => {
                const err = new Error('boom');
                sinon.stub(EcRepository, 'find').returns(Promise.reject(err));
                assert.strictEqual((await settle(EcRepository.get('https://c.example/api/data/x/1', null, null, null, eim))).error, err);
            });
            it('throws a TypeError when find rejects with null', async () => {
                sinon.stub(EcRepository, 'find').returns(Promise.reject(null));
                assert.instanceOf((await settle(EcRepository.get('https://c.example/api/data/x/1', null, null, null, eim))).error, TypeError);
            });
            it('resolves what find resolves', async () => {
                const t = thing('https://c.example/api/data/x/1');
                sinon.stub(EcRepository, 'find').resolves(t);
                assert.strictEqual(await EcRepository.get('https://c.example/api/data/x/1', null, null, null, eim), t);
            });
        });

        describe('when the request fails', () => {
            beforeEach(() => {
                EcRepository.alwaysTryUrl = true;
                EcRepository.unsigned = true;
            });
            describe('without a repository', () => {
                for (const [name, err] of [['not-located', new Error(NOT_LOCATED)], ['not-found', NOT_FOUND]])
                    it(`resolves null when find rejects with ${name}`, async () => {
                        sinon.stub(EcRemote, 'getExpectingObject').rejects(new Error('offline'));
                        sinon.stub(EcRepository, 'find').returns(Promise.reject(err));
                        assert.isNull(await EcRepository.get('https://x/api/data/t/1', null, null, null, eim));
                        assert.equal(EcRepository.find.firstCall.args[1].message, 'offline');
                    });
                it('rethrows other errors from find', async () => {
                    const err = new Error('boom');
                    sinon.stub(EcRemote, 'getExpectingObject').rejects(new Error('offline'));
                    sinon.stub(EcRepository, 'find').returns(Promise.reject(err));
                    assert.strictEqual((await settle(EcRepository.get('https://x/api/data/t/1', null, null, null, eim))).error, err);
                });
                it('throws a TypeError when find rejects with undefined', async () => {
                    sinon.stub(EcRemote, 'getExpectingObject').rejects(new Error('offline'));
                    sinon.stub(EcRepository, 'find').returns(Promise.reject(undefined));
                    assert.instanceOf((await settle(EcRepository.get('https://x/api/data/t/1', null, null, null, eim))).error, TypeError);
                });
            });
            describe('with a repository', () => {
                const r = repo('https://x/api/');
                for (const msg of [NOT_LOCATED, NOT_FOUND])
                    it(`resolves null for "${msg.slice(0, 20)}..."`, async () => {
                        sinon.stub(EcRemote, 'getExpectingObject').returns(Promise.reject(msg));
                        assert.isNull(await EcRepository.get('https://x/api/data/t/1', null, null, r, eim));
                    });
                it('rejects with an Error built from any other error', async () => {
                    sinon.stub(EcRemote, 'getExpectingObject').returns(Promise.reject('offline'));
                    const res = await settle(EcRepository.get('https://x/api/data/t/1', null, null, r, eim));
                    assert.instanceOf(res.error, Error);
                    assert.equal(res.error.message, 'offline');
                });
                it('caches a miss as null when caching', async () => {
                    EcRepository.caching = true;
                    sinon.stub(EcRemote, 'getExpectingObject').returns(Promise.reject(NOT_FOUND));
                    assert.isNull(await EcRepository.get('https://x/api/data/t/1', null, null, r, eim));
                    assert.strictEqual(EcRepository.cache['https://x/api/data/t/1'], null);
                });
            });
        });
    });

    describe('setOffset', () => {
        it('uses the time offset of the last repository whose server the URL contains', () => {
            EcRepository.repos = [repo('https://a/api/', { timeOffset: 5 }), repo('https://b/api/', { timeOffset: 7 }), repo('https://a/api/', { timeOffset: 9 })];
            assert.equal(EcRepository.setOffset('https://a/api/data/1'), 9);
            assert.equal(EcRepository.setOffset('https://b/api/data/1'), 7);
            assert.equal(EcRepository.setOffset('https://c/api/data/1'), 0);
        });
    });

    describe('shouldTryUrl', () => {
        it('decides from the URL, the flag and the repositories', () => {
            assert.isFalse(EcRepository.shouldTryUrl(null));
            assert.isTrue(EcRepository.shouldTryUrl('https://x'));
            EcRepository.repos = [repo(null)];
            assert.isTrue(EcRepository.shouldTryUrl('https://x'));
            EcRepository.repos = [repo(null), repo('https://a/api/')];
            assert.isFalse(EcRepository.shouldTryUrl('https://x'));
            EcRepository.alwaysTryUrl = true;
            assert.isTrue(EcRepository.shouldTryUrl('https://x'));
        });
    });

    describe('_save', () => {
        it('drops empty reader and owner lists, keeps others, and signs', async () => {
            const saveWithout = sinon.stub(EcRepository, '_saveWithoutSigning').resolves('saved');
            const sign = sinon.spy(eim, 'sign');
            const a = thing('https://x/api/data/t/1');
            a.reader = [];
            a.owner = [];
            assert.equal(await EcRepository._save(a, null, null, null, eim), 'saved');
            assert.notProperty(a, 'reader');
            assert.notProperty(a, 'owner');
            const b = thing('https://x/api/data/t/2');
            b.reader = ['r'];
            b.owner = null;
            await EcRepository._save(b, null, null, null, eim);
            assert.deepEqual(b.reader, ['r']);
            assert.property(b, 'owner');
            assert.isNull(b.owner);
            assert.isTrue(sign.calledTwice);
            assert.strictEqual(saveWithout.firstCall.args[0], a);
        });
        it('throws a string for invalid data', () => {
            const bad = thing(null);
            let thrown;
            try { EcRepository._save(bad, null, null, null, eim); } catch (e) { thrown = e; }
            assert.strictEqual(thrown, 'Cannot save data. It is missing a vital component.');
        });
    });

    describe('_saveWithoutSigning', () => {
        let post;
        beforeEach(() => {
            post = sinon.stub(EcRemote, 'postExpectingString').resolves('ok');
        });
        const r = repo(SERVER);

        async function save(data, repoArg) {
            const stamp = sinon.spy(data, 'updateTimestamp');
            await EcRepository._saveWithoutSigning(data, null, null, repoArg, eim);
            return { stamped: stamp.called, url: post.firstCall.args[0], service: post.firstCall.args[1], fd: post.firstCall.args[2] };
        }

        it('posts objects on the repository to their own id, re-stamped', async () => {
            EcRepository.repos = [r];
            const d = thing(SERVER + 'data/schema.org.Thing/abc/123');
            const res = await save(d, r);
            assert.isTrue(res.stamped);
            assert.equal(res.url, d.id);
            assert.notEqual(d.id, SERVER + 'data/schema.org.Thing/abc/123');
            assert.equal(res.fd.get('data'), d.toJson());
            assert.equal(res.fd.get('signatureSheet'), '[]');
        });
        it('registers foreign objects under an md5 id without re-stamping', async () => {
            EcRepository.repos = [r];
            const d = thing('https://other.example/things/1');
            const res = await save(d, r);
            assert.isFalse(res.stamped);
            assert.equal(res.url, SERVER + 'data/schema.org.Thing/' + EcCrypto.md5('https://other.example/things/1'));
        });
        it('treats the same host over another scheme as local for stamping, but registers it', async () => {
            EcRepository.repos = [r];
            const d = thing('http://repo.example/api/things/1');
            const res = await save(d, r);
            assert.isTrue(res.stamped);
            assert.equal(res.url, SERVER + 'data/schema.org.Thing/' + EcCrypto.md5(d.shortId()));
        });
        it('posts to the id when there is no repository', async () => {
            EcRepository.repos = [r];
            const d = thing('https://other.example/things/one');
            const res = await save(d, null);
            assert.isTrue(res.stamped);
            assert.equal(res.url, 'https://other.example/things/one');
        });
        it('posts to the id when alwaysTryUrl is set', async () => {
            EcRepository.repos = [r];
            EcRepository.alwaysTryUrl = true;
            const d = thing('https://other.example/things/one');
            const res = await save(d, r);
            assert.isTrue(res.stamped);
            assert.equal(res.url, 'https://other.example/things/one');
        });
        it('re-stamps a trailing number as a version before posting', async () => {
            EcRepository.repos = [r];
            const d = thing('https://other.example/things/1');
            const res = await save(d, null);
            assert.isTrue(res.stamped);
            assert.match(d.id, /^https:\/\/other\.example\/things\/\d{13}$/);
            assert.equal(res.url, d.id);
        });
        it('reports malformed data to failure and carries on, or throws a string', async () => {
            const d = thing('https://x/api/data/t/1');
            sinon.stub(d, 'invalid').returns(true);
            const failure = sinon.spy();
            await EcRepository._saveWithoutSigning(d, null, failure, null, eim);
            assert.isTrue(failure.calledOnceWith('Data is malformed.'));
            assert.isTrue(post.calledOnce);
            let thrown;
            try { EcRepository._saveWithoutSigning(d, null, null, null, eim); } catch (e) { thrown = e; }
            assert.strictEqual(thrown, 'Data is malformed.');
        });
    });

    describe('deleteRegistered', () => {
        it('deletes by guid on this server or its proxy, otherwise by md5', async () => {
            const del = sinon.stub(EcRemote, '_delete').resolves('deleted');
            const r = new EcRepository();
            r.selectedServer = SERVER;
            await r.deleteRegistered(thing(SERVER + 'data/schema.org.Thing/abc'), null, null, eim);
            assert.equal(del.lastCall.args[0], SERVER + 'data/schema.org.Thing/abc');
            await r.deleteRegistered(thing('https://other.example/things/1'), null, null, eim);
            assert.equal(del.lastCall.args[0], SERVER + 'data/schema.org.Thing/' + EcCrypto.md5('https://other.example/things/1'));
            r.selectedServerProxy = 'https://proxy.example/';
            await r.deleteRegistered(thing('https://proxy.example/things/zz'), null, null, eim);
            assert.equal(del.lastCall.args[0], SERVER + 'data/schema.org.Thing/zz');
            await r.deleteRegistered(thing(SERVER + 'data/schema.org.Thing/abc'), null, null, eim);
            assert.equal(del.lastCall.args[0], SERVER + 'data/schema.org.Thing/' + EcCrypto.md5(SERVER + 'data/schema.org.Thing/abc'));
        });
    });

    describe('multiput', () => {
        it('drops empty reader and owner lists, re-stamps local objects and posts them together', async () => {
            const post = sinon.stub(EcRemote, 'postExpectingString').resolves('ok');
            const r = new EcRepository();
            r.selectedServer = SERVER;
            const local = thing(SERVER + 'data/schema.org.Thing/abc/123');
            local.reader = [];
            local.owner = [];
            const foreign = thing('https://other.example/things/1');
            foreign.reader = ['r'];
            const sameHost = thing('http://repo.example/api/things/2');
            const stamps = [local, foreign, sameHost].map((d) => sinon.spy(d, 'updateTimestamp'));
            assert.equal(await r.multiput([local, foreign, sameHost], null, null, eim), 'ok');
            assert.deepEqual(stamps.map((x) => x.called), [true, false, true]);
            assert.notProperty(local, 'reader');
            assert.notProperty(local, 'owner');
            assert.deepEqual(foreign.reader, ['r']);
            assert.equal(post.firstCall.args[0], SERVER);
            assert.equal(post.firstCall.args[1], 'sky/repo/multiPut');
            const sent = JSON.parse(post.firstCall.args[2].get('data'));
            assert.deepEqual(sent.map((x) => x['@id']), [local.id, foreign.id, sameHost.id]);
        });
        it('throws for invalid data', () => {
            const r = new EcRepository();
            r.selectedServer = SERVER;
            assert.throws(() => r.multiput([thing(null)], null, null, eim), 'Cannot save data. It is missing a vital component.');
        });
    });

    describe('precache', () => {
        let r, post;
        const obj = (id, extra) => Object.assign({ '@id': id, '@type': 'Thing', '@context': 'https://schema.org/' }, extra);
        beforeEach(() => {
            r = new EcRepository();
            r.selectedServer = SERVER;
            post = sinon.stub(EcRemote, 'postExpectingObject');
        });

        it('rejects without urls', async () => {
            assert.equal((await settle(r.precache(null, null, null, eim))).error.message, 'urls not defined.');
        });
        it('fetches objects, caches them under every id and returns those requested', async () => {
            const local = SERVER + 'data/schema.org.Thing/abc';
            const foreign = 'https://other.example/things/one';
            post.resolves([obj(local), obj(foreign)]);
            const out = await r.precache([local, foreign, SERVER + 'data/schema.org.Thing/missing'], null, null, eim);
            assert.deepEqual(out.map((x) => x.id), [local, foreign]);
            assert.equal(post.firstCall.args[1], 'sky/repo/multiGet');
            assert.deepEqual(JSON.parse(post.firstCall.args[2].get('data')), ['data/schema.org.Thing/abc', 'data//' + EcCrypto.md5(foreign), 'data/schema.org.Thing/missing']);
            assert.equal(post.firstCall.args[2].get('signatureSheet'), '[]');
            assert.isNull(post.firstCall.args[2].get('ids'));
            assert.sameMembers(Object.keys(EcRepository.cacheBacking), [
                local,
                SERVER + 'data/abc',
                foreign,
                EcRemoteLinkedData.veryShortId(SERVER, EcCrypto.md5(foreign)),
                EcRemoteLinkedData.veryShortId(SERVER, 'one')
            ]);
        });
        it('requests a trailing number as a version and caches the result only under its id', async () => {
            const foreign = 'https://other.example/things/1';
            post.resolves([obj(foreign)]);
            const out = await r.precache([foreign], null, null, eim);
            assert.deepEqual(out.map((x) => x.id), [foreign]);
            assert.deepEqual(JSON.parse(post.firstCall.args[2].get('data')), ['data//' + EcCrypto.md5(foreign) + '/1']);
            assert.deepEqual(Object.keys(EcRepository.cacheBacking), [foreign]);
        });
        it('keeps versioned objects only under their versioned id', async () => {
            const versioned = SERVER + 'data/schema.org.Thing/abc/123';
            post.resolves([obj(versioned)]);
            const out = await r.precache([versioned], null, null, eim);
            assert.deepEqual(out.map((x) => x.id), [versioned]);
            assert.deepEqual(JSON.parse(post.firstCall.args[2].get('data')), ['data/schema.org.Thing/abc/123']);
            assert.equal(EcRepository.cache[versioned].id, versioned);
            assert.isUndefined(EcRepository.cache[SERVER + 'data/schema.org.Thing/abc']);
        });
        it('skips what is already cached when caching, and does not post when everything is', async () => {
            EcRepository.caching = true;
            const a = SERVER + 'data/schema.org.Thing/a';
            const b = SERVER + 'data/schema.org.Thing/b';
            EcRepository.cache[a] = thing(a);
            EcRepository.cache[b] = null;
            const out = await r.precache([a, b], null, null, eim);
            assert.deepEqual(out.map((x) => x.id), [a]);
            assert.isFalse(post.called);
            const c = SERVER + 'data/schema.org.Thing/c';
            post.resolves([obj(c)]);
            const out2 = await r.precache([a, c], null, null, eim);
            assert.deepEqual(out2.map((x) => x.id), [a, c]);
            assert.deepEqual(JSON.parse(post.firstCall.args[2].get('data')), ['data/schema.org.Thing/c']);
        });
        it('asks for ids under L2 caching, then fetches the ids it is given', async () => {
            EcRepository.cachingL2 = true;
            const a = SERVER + 'data/schema.org.Thing/a';
            post.onFirstCall().resolves([a + '/1']);
            post.onSecondCall().resolves([obj(a + '/1')]);
            const success = sinon.stub().returnsArg(0);
            const out = await r.precache([a], success, null, eim);
            assert.equal(post.firstCall.args[2].get('ids'), 'true');
            assert.isNull(post.secondCall.args[2].get('ids'));
            assert.deepEqual(JSON.parse(post.secondCall.args[2].get('data')), ['data/schema.org.Thing/a/1']);
            assert.deepEqual(out.map((x) => x.id), [a + '/1']);
            assert.isTrue(success.calledOnce);
        });
        it('makes a second attempt for ids whose objects did not come back', async () => {
            const a = SERVER + 'data/schema.org.Thing/a';
            const other = 'https://other.example/x/9';
            post.onCall(0).resolves([other + '/5']);
            post.onCall(1).resolves([]);
            post.onCall(2).resolves([obj(other)]);
            const out = await r.precache([a], null, null, eim);
            // The retry asks for the same versioned id again, and finds nothing under it.
            assert.deepEqual(post.getCalls().map((c) => JSON.parse(c.args[2].get('data'))), [
                ['data/schema.org.Thing/a'],
                ['data//' + EcCrypto.md5(other + '/5') + '/5'],
                ['data//' + EcCrypto.md5(other + '/5') + '/5']
            ]);
            assert.deepEqual(out, []);
        });
        it('posts unsigned when the repository is unsigned', async () => {
            EcRepository.unsigned = true;
            const sig = sinon.spy(eim, 'signatureSheet');
            post.resolves([]);
            await r.precache([SERVER + 'data/schema.org.Thing/a'], null, null, eim);
            assert.isFalse(sig.called);
            assert.isNull(post.firstCall.args[2].get('signatureSheet'));
        });
    });

    describe('multiget', () => {
        it('precaches, then gets each URL and drops what is missing', async () => {
            const r = new EcRepository();
            r.selectedServer = SERVER;
            sinon.stub(r, 'precache').resolves([]);
            const a = thing(SERVER + 'a');
            sinon.stub(EcRepository, 'get').callsFake(async (url) => (url.endsWith('a') ? a : null));
            const success = sinon.stub().returnsArg(0);
            const out = await r.multiget([SERVER + 'a', SERVER + 'b'], success, null, eim);
            assert.deepEqual(out, [a]);
            assert.isTrue(success.calledOnceWith([a]));
            assert.deepEqual(EcRepository.get.getCalls().map((c) => [c.args[0], c.args[3]]), [[SERVER + 'a', r], [SERVER + 'b', r]]);
        });
    });

    describe('searchWithParams', () => {
        let r, post;
        const obj = (id) => ({ '@id': id, '@type': 'Thing', '@context': 'https://schema.org/' });
        beforeEach(() => {
            r = new EcRepository();
            r.selectedServer = SERVER;
            post = sinon.stub(EcRemote, 'postExpectingObject');
        });
        it('maps objects, calls eachSuccess and caches them when caching', async () => {
            EcRepository.caching = true;
            post.resolves([obj(SERVER + 'data/schema.org.Thing/a')]);
            const each = sinon.spy();
            const out = await r.searchWithParams('q', { size: 5 }, each, null, null, eim);
            assert.deepEqual(out.map((x) => x.id), [SERVER + 'data/schema.org.Thing/a']);
            assert.isTrue(each.calledOnce);
            assert.equal(post.firstCall.args[1], 'sky/repo/search');
            assert.equal(post.firstCall.args[2].get('data'), 'q');
            assert.equal(post.firstCall.args[2].get('searchParams'), '{"size":5}');
            assert.equal(post.firstCall.args[2].get('signatureSheet'), '[]');
            assert.equal(EcRepository.cache[EcRemoteLinkedData.veryShortId(SERVER, 'a')].id, SERVER + 'data/schema.org.Thing/a');
        });
        it('rejects with a string when the server returns nothing', async () => {
            post.resolves(null);
            assert.strictEqual((await settle(r.searchWithParams('q', null, null, null, null, eim))).error, 'Error in search. See HTTP request for more details.');
        });
        it('signs unless unsigned is set on the repository or the call', async () => {
            const sig = sinon.spy(eim, 'signatureSheet');
            post.resolves([]);
            await r.searchWithParams('q', { unsigned: true }, null, null, null, eim);
            EcRepository.unsigned = true;
            await r.searchWithParams('q', {}, null, null, null, eim);
            assert.isFalse(sig.called);
            assert.equal(post.firstCall.args[2].get('signatureSheet'), '');
            EcRepository.unsigned = false;
            await r.searchWithParams('q', { unsigned: 'true' }, null, null, null, eim);
            assert.isTrue(sig.calledOnce);
        });
        it('requests ids under L2 caching and precaches them', async () => {
            EcRepository.cachingL2 = true;
            post.resolves([SERVER + 'data/schema.org.Thing/a/1', 'https://other.example/x/2/3']);
            const found = thing(SERVER + 'data/schema.org.Thing/a/1');
            const second = thing('https://other.example/x/2');
            const pre = sinon.stub(r, 'precache');
            pre.onFirstCall().resolves([found]);
            pre.onSecondCall().resolves([second]);
            const each = sinon.spy();
            const out = await r.searchWithParams('q', null, each, null, null, eim);
            assert.equal(post.firstCall.args[2].get('searchParams'), '{"ids":true}');
            assert.deepEqual(pre.firstCall.args.slice(0, 5), [[SERVER + 'data/schema.org.Thing/a/1', 'https://other.example/x/2/3'], null, null, eim, true]);
            // A non-repository id is retried as is; trimVersionFromUrl leaves it alone.
            assert.deepEqual(pre.secondCall.args[0], ['https://other.example/x/2/3']);
            assert.deepEqual(out, [found, second]);
            assert.isTrue(each.calledOnceWith(found));
        });
        it('answers repeated searches from the search cache', async () => {
            EcRepository.cachingSearch = true;
            post.resolves([obj(SERVER + 'data/schema.org.Thing/a')]);
            const first = await r.searchWithParams('q', null, null, null, null, eim);
            const each = sinon.spy();
            const second = await r.searchWithParams('q', null, each, null, null, eim);
            assert.strictEqual(second, first);
            assert.isTrue(post.calledOnce);
            assert.isTrue(each.calledOnce);
        });
    });

    describe('searchParamProps', () => {
        const pk = (pem) => ({ ppk: { toPk: () => ({ toPem: () => pem }) } });
        it('copies paging and type parameters', () => {
            const r = new EcRepository();
            const props = {};
            assert.equal(r.searchParamProps('q', { start: 1, size: 2, types: 't', sort: 's', track_scores: true, index_hint: 'h', other: 1 }, props, eim), 'q');
            assert.deepEqual(props, { start: 1, size: 2, types: 't', sort: 's', track_scores: true, index_hint: 'h' });
        });
        it('adds ownership clauses', () => {
            const r = new EcRepository();
            assert.equal(r.searchParamProps('q', { ownership: 'public' }, {}, eim), '(q) AND (_missing_:owner) AND (_missing_:@owner)');
            assert.equal(r.searchParamProps('(q)', { ownership: 'owned' }, {}, eim), '(q) AND (_exists_:owner OR _exists_:@owner)');
            assert.equal(r.searchParamProps('(a) OR (b', { ownership: 'other' }, {}, eim), '((a) OR (b)');
            const me = Object.assign({}, eim, { ids: [pk('PEM1'), pk('PEM2')] });
            assert.equal(r.searchParamProps('q', { ownership: 'me' }, {}, me), '(q) AND (\\*owner:"PEM1" OR \\*owner:"PEM2")');
        });
    });

    describe('auto-detection', () => {
        let hadWindow, oldWindow;
        beforeEach(() => {
            sinon.stub(console, 'trace');
            hadWindow = 'window' in global;
            oldWindow = global.window;
        });
        afterEach(() => {
            if (hadWindow) global.window = oldWindow;
            else delete global.window;
        });
        function fakeWindow(protocol) {
            global.window = {
                location: { protocol, host: 'cass.example:3000', hostname: 'cass.example', pathname: '/app/page' },
                document: {
                    createElement: () => {
                        const a = {};
                        Object.defineProperty(a, 'href', { set(v) { const u = new URL(v); a.host = u.host; a.pathname = u.pathname; } });
                        return a;
                    }
                }
            };
        }

        it('tries every host, prefix and protocol in order until one answers', () => {
            fakeWindow('http:');
            const r = new EcRepository();
            const guesses = [];
            sinon.stub(r, 'autoDetectRepositoryActual').callsFake((g) => { guesses.push(g); return false; });
            r.autoDetectRepository();
            // 8 host forms x 6 prefixes x 2 protocols for an http: page.
            assert.equal(guesses.length, 96);
            assert.deepEqual(guesses.slice(0, 4), ['http://cass.example:3000/app/api/', 'https://cass.example:3000/app/api/', 'http://cass.example:3000/app/api/custom/', 'https://cass.example:3000/app/api/custom/']);
            assert.deepEqual(guesses.slice(-2), ['http://cass.service.example:8080/api/custom/', 'https://cass.service.example:8080/api/custom/']);
            const hit = 'https://cass.example:3000/app/api/custom/';
            guesses.length = 0;
            r.autoDetectRepositoryActual.callsFake((g) => { guesses.push(g); return g === hit; });
            r.autoDetectRepository();
            assert.equal(guesses[guesses.length - 1], hit);
            assert.equal(guesses.length, 4);
        });
        it('starts from the selected server when there is one', () => {
            fakeWindow('https:');
            const r = new EcRepository();
            r.selectedServer = 'https://chosen.example/x/api/';
            const guesses = [];
            sinon.stub(r, 'autoDetectRepositoryActual').callsFake((g) => { guesses.push(g); return false; });
            r.autoDetectRepository();
            assert.deepEqual(guesses.slice(0, 3), ['https://chosen.example/x/api/', 'https://chosen.example/app/api/', 'https://chosen.example/app/api/custom/']);
            assert.equal(guesses.length, 7);
        });
        it('throws without a window when a server is selected', () => {
            delete global.window;
            const r = new EcRepository();
            r.selectedServer = SERVER;
            assert.throws(() => r.autoDetectRepository(), ReferenceError);
        });
        it('probes asynchronously, then tries custom endpoints, then gives up', () => {
            fakeWindow('https:');
            const clock = sinon.useFakeTimers();
            const r = new EcRepository();
            const guesses = [];
            sinon.stub(r, 'autoDetectRepositoryActualAsync').callsFake((g) => guesses.push(g));
            const failure = sinon.spy();
            r.autoDetectRepositoryAsync(null, failure);
            assert.isFalse(r.autoDetectFound);
            // An https: page only tries https.
            assert.equal(guesses.length, 32);
            assert.deepEqual(guesses.slice(0, 2), ['https://cass.example:3000/app/api/', 'https://cass.example:3000/']);
            clock.tick(5000);
            // Each of the 32 probes then schedules every custom endpoint, each with its own give-up timer.
            assert.equal(guesses.length, 32 + 512);
            assert.equal(guesses[32], 'https://cass.example:3000/app/api/custom/');
            clock.tick(5000);
            assert.equal(failure.callCount, 512);
            assert.isTrue(failure.alwaysCalledWith('Could not find service.'));
            clock.restore();
        });
        it('stops the async fallbacks once something answers', () => {
            fakeWindow('https:');
            const clock = sinon.useFakeTimers();
            const r = new EcRepository();
            const guesses = [];
            sinon.stub(r, 'autoDetectRepositoryActualAsync').callsFake((g) => guesses.push(g));
            const failure = sinon.spy();
            r.autoDetectRepositoryAsync(null, failure);
            r.autoDetectFound = true;
            clock.tick(20000);
            assert.equal(guesses.length, 32);
            assert.isFalse(failure.called);
            clock.restore();
        });

        describe('single probes', () => {
            const NOW = 1700000000000;
            let clock;
            beforeEach(() => { clock = sinon.useFakeTimers({ now: NOW }); });
            afterEach(() => clock.restore());

            for (const method of ['autoDetectRepositoryActual', 'autoDetectRepositoryActualAsync']) {
                it(`${method} accepts a pong and records the time offset`, () => {
                    const r = new EcRepository();
                    const success = sinon.spy();
                    sinon.stub(EcRemote, 'getExpectingObject').callsFake((g, svc, ok) => ok({ ping: 'pong', time: NOW + 50 }));
                    assert.isTrue(r[method]('https://g.example/api/', success));
                    assert.equal(r.selectedServer, 'https://g.example/api/');
                    assert.equal(r.timeOffset, 50);
                    assert.equal(EcRemote.getExpectingObject.firstCall.args[1], 'ping');
                    if (method.endsWith('Async')) assert.isTrue(success.calledOnce);
                });
                it(`${method} accepts "pong" in a failure body and ignores other replies`, () => {
                    const r = new EcRepository();
                    const success = sinon.spy();
                    const replies = [null, '', { indexOf: () => { throw new Error('x'); } }, 'nope', 'pong!'];
                    sinon.stub(EcRemote, 'getExpectingObject').callsFake((g, svc, ok, fail) => fail(replies.shift()));
                    for (let i = 0; i < 4; i++) {
                        assert.isFalse(r[method]('https://g.example/api/', success));
                        assert.isFalse(r.autoDetectFound);
                    }
                    assert.isTrue(r[method]('https://g.example/api/', success));
                    assert.equal(r.selectedServer, 'https://g.example/api/');
                });
                it(`${method} ignores empty guesses and swallows request errors`, () => {
                    const r = new EcRepository();
                    sinon.stub(EcRemote, 'getExpectingObject').throws(new Error('offline'));
                    assert.isFalse(r[method]('', null));
                    assert.isFalse(r[method](null, null));
                    assert.isFalse(EcRemote.getExpectingObject.called);
                    assert.isFalse(r[method]('https://g.example/api/', null));
                });
            }
            it('autoDetectRepositoryActualAsync reports success only once', () => {
                const r = new EcRepository();
                const success = sinon.spy();
                sinon.stub(EcRemote, 'getExpectingObject').callsFake((g, svc, ok) => ok({ ping: 'pong' }));
                r.autoDetectRepositoryActualAsync('https://g1.example/api/', success);
                r.autoDetectRepositoryActualAsync('https://g2.example/api/', success);
                assert.isTrue(success.calledOnce);
                assert.equal(r.selectedServer, 'https://g1.example/api/');
            });
            it('autoDetectRepositoryActual restores the request timeout', () => {
                const r = new EcRepository();
                const old = EcRemote.timeout;
                let during;
                sinon.stub(EcRemote, 'getExpectingObject').callsFake(() => { during = EcRemote.timeout; });
                r.autoDetectRepositoryActual('https://g.example/api/');
                assert.equal(during, 500);
                assert.equal(EcRemote.timeout, old);
            });
        });
    });

    describe('fetchServerAdminKeys', () => {
        it('copies the keys and hands them to success', async () => {
            const r = new EcRepository();
            r.selectedServer = SERVER;
            const keys = ['k1', 'k2'];
            sinon.stub(EcRemote, 'getExpectingObject').callsFake((s, svc, ok) => Promise.resolve(ok(keys)));
            const success = sinon.spy();
            await r.fetchServerAdminKeys(success);
            assert.deepEqual(r.adminKeys, keys);
            assert.notStrictEqual(r.adminKeys, keys);
            assert.isTrue(success.calledOnceWith(keys));
            assert.equal(EcRemote.getExpectingObject.firstCall.args[1], 'sky/admin');
            assert.deepEqual(await r.fetchServerAdminKeys(), keys);
            r.selectedServer = 'https://repo.example/api';
            await r.fetchServerAdminKeys();
            assert.equal(EcRemote.getExpectingObject.lastCall.args[1], '/sky/admin');
        });
        it('passes failures on, or throws them as Errors', () => {
            const r = new EcRepository();
            r.selectedServer = SERVER;
            sinon.stub(EcRemote, 'getExpectingObject').callsFake((s, svc, ok, fail) => fail('nope'));
            const failure = sinon.spy();
            r.fetchServerAdminKeys(null, failure);
            assert.isTrue(failure.calledOnceWith('nope'));
            assert.throws(() => r.fetchServerAdminKeys(), 'nope');
        });
    });

    describe('searchAs', () => {
        it('decrypts results, drops ones that fail, and copies them into new objects', async () => {
            const results = [thing('https://x/1'), thing('https://x/2'), thing('https://x/3')];
            const r = { searchWithParams: sinon.stub().resolves(results) };
            sinon.stub(EcEncryptedValue, 'fromEncryptedValue').callsFake(async (p1) => {
                if (p1.id.endsWith('2')) throw new Error('cannot decrypt');
                if (p1.id.endsWith('3')) return null;
                return p1;
            });
            sinon.stub(console, 'log');
            const factory = () => new EcRemoteLinkedData('https://schema.org/', 'Thing');
            const out = await EcRepository.searchAs(r, 'name:x', factory, null, null, null, eim);
            assert.deepEqual(out.map((x) => x.id), ['https://x/1']);
            assert.instanceOf(out[0], EcRemoteLinkedData);
            assert.notStrictEqual(out[0], results[0]);
            assert.isTrue(console.log.calledWith('SearchAs error: Error: cannot decrypt'));
            const [query, paramObj] = r.searchWithParams.firstCall.args;
            assert.equal(query, '(name:x) AND ' + factory().getSearchStringByType());
            assert.equal(paramObj.index_hint, '*thing,*encryptedvalue');
            await EcRepository.searchAs(r, '', factory, null, null, null, eim);
            assert.equal(r.searchWithParams.lastCall.args[0], factory().getSearchStringByType());
        });
    });

    describe('negotiateTimeOffset', () => {
        it('applies the ping settings and builds the key forwarding table', async () => {
            const clock = sinon.useFakeTimers({ now: 1700000000000 });
            try {
                const r = new EcRepository();
                r.selectedServer = SERVER;
                sinon.stub(EcRemote, 'getExpectingObject').resolves({ ping: 'pong', time: 1700000000250, plugins: '["p1"]', postMaxSize: 99, signatureSheetHashAlgorithm: 'SHA-256' });
                sinon.stub(r, 'buildKeyForwardingTable').resolves('built');
                const login = sinon.spy();
                const oldPlugins = EcRepository.defaultPlugins;
                assert.equal(await r.negotiateTimeOffset(null, null, login), 'built');
                assert.equal(r.timeOffset, 250);
                assert.equal(r.postMaxSize, 99);
                assert.equal(r.signatureSheetHashAlgorithm, 'SHA-256');
                assert.deepEqual(EcRepository.defaultPlugins, ['p1']);
                assert.isTrue(login.calledOnce);
                EcRepository.defaultPlugins = oldPlugins;
                EcRemote.getExpectingObject.resolves({ ping: 'nope' });
                assert.isUndefined(await r.negotiateTimeOffset());
            } finally {
                clock.restore();
            }
        });
    });

    describe('buildKeyForwardingTable', () => {
        it('adds every rekey request found, in order', async () => {
            const order = [];
            const reqs = [1, 2, 3].map((n) => ({ addRekeyRequestToForwardingTable: async () => { order.push(n); } }));
            sinon.stub(EcRepository, 'searchAs').resolves(reqs);
            const r = new EcRepository();
            const success = sinon.spy();
            await r.buildKeyForwardingTable(success, null, eim);
            assert.deepEqual(order, [1, 2, 3]);
            assert.isTrue(success.calledOnce);
            assert.strictEqual(EcRepository.searchAs.firstCall.args[0], r);
            assert.equal(EcRepository.searchAs.firstCall.args[1], '*');
            assert.deepEqual(EcRepository.searchAs.firstCall.args[5], { size: 10000 });
        });
    });

    describe('find', () => {
        it('returns the search result whose id or short id is the URL', async () => {
            const url = 'https://a/api/data/t/1';
            const exact = thing(url);
            const r = repo('https://a/api/', { search: sinon.stub().resolves([thing('https://a/api/data/t/2'), exact]) });
            EcRepository.repos = [r];
            assert.strictEqual(await EcRepository.find(url, 'err', {}, 0, null, null, eim), exact);
            assert.equal(r.search.firstCall.args[0], '@id:"' + url + '"');
            const versioned = thing(url + '/123');
            r.search.resolves([versioned]);
            assert.strictEqual(await EcRepository.find(url, 'err', {}, 0, null, null, eim), versioned);
        });
        it('caches the match when caching', async () => {
            EcRepository.caching = true;
            const url = 'https://a/api/data/t/1';
            const exact = thing(url);
            EcRepository.repos = [repo('https://a/api/', { search: sinon.stub().resolves([exact]) })];
            await EcRepository.find(url, 'err', {}, 0, null, null, eim);
            assert.strictEqual(EcRepository.cache[url], exact);
        });
        it('moves to the next repository when nothing matches, then rejects with the error', async () => {
            const a = repo('https://a/api/', { search: sinon.stub().resolves([thing('https://a/api/data/t/2')]) });
            const b = repo('https://b/api/', { search: sinon.stub().resolves([]) });
            const c = repo('https://c/api/', { search: sinon.stub().resolves(null) });
            EcRepository.repos = [a, b, c];
            const res = await settle(EcRepository.find('https://z/api/data/t/1', 'not here', {}, 0, null, null, eim));
            // Each repository passed through wraps the error in another Error.
            assert.equal(res.error.message, 'Error: Error: Error: not here');
            assert.isTrue(a.search.calledOnce && b.search.calledOnce && c.search.calledOnce);
        });
        it('skips repositories already searched and those without a server', async () => {
            const a = repo('https://a/api/', { search: sinon.stub().resolves([]) });
            EcRepository.repos = [repo(null), a, a];
            await settle(EcRepository.find('https://z/1', 'e', {}, 0, null, null, eim));
            assert.isTrue(a.search.calledOnce);
        });
        it('carries a search failure on as the error', async () => {
            const a = repo('https://a/api/', { search: sinon.stub().rejects('search broke') });
            EcRepository.repos = [a];
            const res = await settle(EcRepository.find('https://z/1', 'e', {}, 0, null, null, eim));
            assert.equal(res.error.message, 'search broke');
        });
    });
});
