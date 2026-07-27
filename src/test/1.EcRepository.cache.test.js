require('fake-indexeddb/auto');

const schema = {
    "Thing": require('../org/schema/Thing.js')
};

let chai = require("chai");
const EcRepository = require('../org/cassproject/ebac/repository/EcRepository.js');
const EcCrypto = require('../com/eduworks/ec/crypto/EcCrypto.js');
const EcRemoteLinkedData = require('../org/cassproject/schema/general/EcRemoteLinkedData.js');

let assert = chai.assert;

const TEST_DB = "EcRepositoryCacheTest";

// Ids that contain /api/data/ and end in /<digits> are "versioned" and eligible
// for L2 caching; anything else is L1-only.
let versionedId = () => "http://localhost/api/data/schema.org.Thing/" + EcCrypto.generateUUID() + "/1690000000000";
let unversionedId = () => "http://localhost/api/data/schema.org.Thing/" + EcCrypto.generateUUID();

let makeThing = (id) => {
    let thing = new schema.Thing();
    thing.id = id;
    thing.setName("Some Thing " + EcCrypto.generateUUID());
    return thing;
};

let openTestDb = () => new Promise((resolve, reject) => {
    const request = indexedDB.open(TEST_DB, 3);
    request.onerror = reject;
    request.onupgradeneeded = (event) => {
        event.target.result.createObjectStore(EcRepository.LONGIDS, { keyPath: "id" });
    };
    request.onsuccess = (event) => resolve(event.target.result);
});

// Reads straight from IndexedDB, bypassing L1, to observe what the proxy wrote.
let l2Get = (id) => new Promise((resolve, reject) => {
    const transaction = EcRepository.cacheDB.transaction(EcRepository.LONGIDS, "readonly");
    const request = transaction.objectStore(EcRepository.LONGIDS).get(id);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result == null ? null : request.result);
});

let l2Count = () => new Promise((resolve, reject) => {
    const transaction = EcRepository.cacheDB.transaction(EcRepository.LONGIDS, "readonly");
    const request = transaction.objectStore(EcRepository.LONGIDS).count();
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
});

describe("EcRepository (Cache Management)", () => {
    before(async () => {
        EcRepository.caching = true;
        EcRepository.cachingL2 = false;
        EcRepository.clearCache();
        EcRepository.cacheDB = await openTestDb();
    });
    after(() => {
        EcRepository.cachingL2 = true;
        EcRepository.clearCache();
        EcRepository.caching = false;
        EcRepository.cachingL2 = false;
        EcRepository.cacheDB.close();
        EcRepository.cacheDB = null;
        indexedDB.deleteDatabase(TEST_DB);
    });

    describe("L1", () => {
        before(() => {
            EcRepository.cachingL2 = false;
        });
        it('cache proxy reads and writes the cacheBacking object', async () => {
            let id = unversionedId();
            let thing = makeThing(id);
            EcRepository.cache[id] = thing;
            assert.strictEqual(EcRepository.cacheBacking[id], thing, "Write through proxy did not land in cacheBacking.");
            EcRepository.cacheBacking[id + "/direct"] = thing;
            assert.strictEqual(EcRepository.cache[id + "/direct"], thing, "Write to cacheBacking not visible through proxy.");
            assert.strictEqual(await EcRepository.cacheGet(id), thing);
            delete EcRepository.cache[id + "/direct"];
        });
        it('delete through the proxy removes the entry', async () => {
            let id = unversionedId();
            EcRepository.cache[id] = makeThing(id);
            delete EcRepository.cache[id];
            assert.isUndefined(EcRepository.cacheBacking[id]);
            assert.isUndefined(await EcRepository.cacheGet(id));
        });
        it('clearCache empties L1', async () => {
            let ids = [unversionedId(), unversionedId(), versionedId()];
            for (let id of ids)
                EcRepository.cache[id] = makeThing(id);
            EcRepository.clearCache();
            assert.equal(Object.keys(EcRepository.cacheBacking).length, 0);
            for (let id of ids)
                assert.isUndefined(await EcRepository.cacheGet(id));
        });
    });

    describe("L2", () => {
        before(() => {
            EcRepository.cachingL2 = true;
        });
        it('versioned writes go to both L1 and IndexedDB', async () => {
            let id = versionedId();
            EcRepository.cache[id] = makeThing(id);
            assert.isDefined(EcRepository.cacheBacking[id], "Entry missing from L1.");
            let stored = await l2Get(id);
            assert.isNotNull(stored, "Entry missing from IndexedDB.");
            assert.equal(stored.id, id);
        });
        it('unversioned writes stay in L1 only', async () => {
            let id = unversionedId();
            EcRepository.cache[id] = makeThing(id);
            assert.isDefined(EcRepository.cacheBacking[id], "Entry missing from L1.");
            assert.isNull(await l2Get(id), "Unversioned entry should not be in IndexedDB.");
        });
        it('cacheGet falls back to IndexedDB on L1 miss', async () => {
            let id = versionedId();
            let thing = makeThing(id);
            EcRepository.cache[id] = thing;
            // Evict from L1 only; a proxy delete would also remove the L2 copy.
            delete EcRepository.cacheBacking[id];
            let got = await EcRepository.cacheGet(id);
            assert.instanceOf(got, EcRemoteLinkedData);
            assert.equal(got.id, id);
            assert.equal(got.getName(), thing.getName());
        });
        it('delete through the proxy removes the entry from both layers', async () => {
            let id = versionedId();
            EcRepository.cache[id] = makeThing(id);
            delete EcRepository.cache[id];
            assert.isUndefined(EcRepository.cacheBacking[id], "Entry still in L1.");
            assert.isNull(await l2Get(id), "Entry still in IndexedDB.");
            assert.isUndefined(await EcRepository.cacheGet(id));
        });
        it('setting an entry to null removes it from IndexedDB', async () => {
            let id = versionedId();
            EcRepository.cache[id] = makeThing(id);
            assert.isNotNull(await l2Get(id));
            EcRepository.cache[id] = null;
            assert.isNull(await l2Get(id), "Entry still in IndexedDB.");
            assert.isNull(EcRepository.cacheBacking[id], "L1 should hold the null marker.");
            delete EcRepository.cache[id];
        });
    });

    describe("clearCache", () => {
        it('clears both L1 and L2 when L2 caching is enabled', async () => {
            EcRepository.cachingL2 = true;
            let vId = versionedId();
            let uId = unversionedId();
            EcRepository.cache[vId] = makeThing(vId);
            EcRepository.cache[uId] = makeThing(uId);
            assert.isAbove(await l2Count(), 0);
            EcRepository.clearCache();
            assert.equal(Object.keys(EcRepository.cacheBacking).length, 0);
            assert.equal(await l2Count(), 0, "IndexedDB store not emptied.");
            assert.isUndefined(await EcRepository.cacheGet(vId));
            assert.isUndefined(await EcRepository.cacheGet(uId));
        });
        it('clears only L1 when L2 caching is disabled', async () => {
            EcRepository.cachingL2 = true;
            let id = versionedId();
            EcRepository.cache[id] = makeThing(id);
            EcRepository.cachingL2 = false;
            EcRepository.clearCache();
            assert.equal(Object.keys(EcRepository.cacheBacking).length, 0);
            assert.isNotNull(await l2Get(id), "IndexedDB copy should survive an L1-only clear.");
            // The surviving L2 copy is served again once L2 caching is re-enabled.
            EcRepository.cachingL2 = true;
            let got = await EcRepository.cacheGet(id);
            assert.instanceOf(got, EcRemoteLinkedData);
            assert.equal(got.id, id);
            EcRepository.clearCache();
        });
    });
});
