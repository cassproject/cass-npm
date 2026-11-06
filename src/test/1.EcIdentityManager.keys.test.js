require('../../index.js');
const chai = require('chai');
const sinon = require('sinon');
const EcIdentityManager = require('../org/cassproject/ebac/identity/EcIdentityManager.js');
const EcIdentity = require('../org/cassproject/ebac/identity/EcIdentity.js');
const EcContact = require('../org/cassproject/ebac/identity/EcContact.js');
const EcContactGrant = require('../org/cassproject/ebac/identity/EcContactGrant.js');
const EcPpk = require('../com/eduworks/ec/crypto/EcPpk.js');
const EcPk = require('../com/eduworks/ec/crypto/EcPk.js');
const EcPpkFacade = require('../com/eduworks/ec/crypto/EcPpkFacade.js');
const EcRsaOaep = require('../com/eduworks/ec/crypto/EcRsaOaep.js');
const EcRsaOaepAsyncWorker = require('../com/eduworks/ec/crypto/EcRsaOaepAsyncWorker.js');

const assert = chai.assert;
const isNode = typeof process !== 'undefined' && process.versions?.node != null && typeof window === 'undefined';

const PEM_A = "-----BEGIN RSA PRIVATE KEY-----MIIEowIBAAKCAQEAzzy0+Hau1QfZoZo/cUUaEdqWHoN3f+BezVUM8DZpxWrrnsKhKSV+ieEHZRduVM4LfxeByWhbzjkAvE8IWbQIGOA60UhZSjgjuSpNtlHRgmommkBtkvMN65TQwfuD6Z1GnPrE+T2PciKOPiiD5/5836zadSn4tMrM52jMZbUS/zi8P61y9TZejXI1KCgKYoi7po91eXmklTN192nG7iiOoUxz2TQFHG8VxqRi2UcBS+WuFEvLOayvCH5aZpZvN9GlR3EdbrCcZkDLFF9gict9Z3LbSWAe+0/RejgCe24MpfQsWnPNl/9ZSiFG7mbeH6G1hZl0Hahr+xBKrqdNMGfk8wIDAQABAoIBAGDPFB8pmhyMMT9Lxi1MwZPrj8srUOyczMyQ2Z1xXdHKU81zUEPfbxBL3d98pZ7aLgat3YRPyus4N77AEL+O2WV9ghx39rY0KYP7Xhg4em241tWiGU3XWv5dI3Qq4YGFZhI5F0DzYApKWDZzSMNcX8tBfT/UXoleX4AOtcUhZIFykUd0bgcIA93lHaLnL5r+CyuUcYaLmzR7imbGO18SAEuTIRcOExmcX1NLKrCQwfreYEVb87GAddfWefCw2SkwkyMXeQSJzPKEzSHTMGZr51eUkDjhFIiDOcE1jIDabN9auVIGH18Pu/1d3OX+41hQ6Kz8bmuACo7Yr6HjRxfcwkECgYEA6y2W/7Qqny75uMpAgJyd/BGeNcXNv9p5uOo+iUAzEcUeEQ1hmvkpW9AsZf+MS3BIJXXScafZF9zn1fOURaw9aE0se2fhM/odiFE/FdgtWYwGxVJalK85g33v1lphc5Zp88SyOt8O+hFah+viPIHwVT+W+KE/s1FtrawyiD+9KOECgYEA4ZXS36EGCYXyiCguPgVjCHvvZEB6BElZNaLO9Sd0Vbz82k2Y80JTFtuqJqVFdH70OpRar7GM4zxxYkw8a8VyGiUIwJkAx+vRYkPBOSmCIS+EziYsBK+DJkEffntzUWSAFtA16L1pZL1joVFfav6Hs0qbnFcra27VCj6t7FLUJFMCgYA8hfUQRWuan9pAhjxnXOcDkf0nVYqHz0/4GMCTTeRWtGXyeYEfAvRz3nUuor+WQoUurs3D1jB2hbFcTF1iONts1j+WWruIRtwG0vHrS0EQhIrRiUoqbZXdkzF/9q6Rsqn9xCciI3mVPZYQ2NHWRJJ3PfA6eDUOjuws/93ZVp31wQKBgCnswmg1cP3MGysa7J0yOxmUjwU+xm6NgzroqzX8wy48FXItAcQUC4UwBgtwo9vmzFUmxUPp55lD3n66VHBjHbWmNF43EWIWfa+ZkAujnz+zqSb3CS9Fv0YYzFWhc+komHWk9J/ws+m5GQ8eJHGqJGY583m26abpzkY9J+3H5w1pAoGBAIuF5suYbI2fmXnRlJWgVTy7UHub4exvssSxSoHZzjGH8gAlcqduTKjSq7A5JqAWwMPBSN7uoXgITWzVenV86WOTG6+YuWFpjmCdrQ2wNuj6di02KEBGSQzUa1xclumnArDywr6A5NKc8ZdmXuD3BnsBFgF75rrE/WRCKwvMdE55-----END RSA PRIVATE KEY-----";
const PEM_B = "-----BEGIN RSA PRIVATE KEY-----MIIEogIBAAKCAQEAr8oXR8sAu5zJvWk0BRbL/yFfz7zTv76nlwk498FqfyVtfnL13CAiwKWqDx6aNvlYXEVFvjMIclMkIFVqHFJRFBiVEQpuP//Ltd4WKzsRWlWWAGvNUfrgKMip62fZHQstC5MJUSDyCd3ljZe/1HjLFrvDsvjJ3o+GPOaJaHtlkz+Y0K7GrbBM4AzduzowNgcsHbmJ154QTTN6uw4ke1BAf3dRZ7ysyDKonJEtQGVGWvmYOOm5gwf5CHIqx7zp+zDROxzXvFHu0Wevh2WSzPO8u5cW3INe7kjgsG/mQm9QUW3m0+HT/wMh4WOTaR5yBwYMt7akC9Xs9zl2Vus80QQ4+QIDAQABAoIBABoX5VzCxVkT7N4wv4gB2kYErjQn00ajBj1lIQ+lpik5ZQdgCR6jpoTyEkwsPrfqSzNnFPMmoBpYPQSPqTCLB330KCxfX/4f+h0E2kWQfwLpsVpephuFIcDsCEzpHVEyV31gVgG04jiUt35NCCyBwaOeO25Vf6GJrGNd1QetSWaRymB6tLHGyJAQoLEl40XHizRDMDcOiN5SBH9rgP4e1tCNxPhIqHl9Pmzif/39TXBYInY990zLUPGd2VN+2kZ4G9XFxchvloze+eyfv14ghZ3AeUXytd0esTj8sEW5Y0zKLDLyxujsrHGRVFIl3yTpJJxRHik64uwz2AHbrzSCYAECgYEA97obu9d9A1goQvzvTpdIjfEGVS6eNe1ruEUtVGgdP0Xucy10sZZPhGjfL2ww2Ls1AMxJChNpbGkqb0X8ObQk2GOty7wavpplr+1ACvSVHCj8qJ81AJquxSNFF4l9ymTOr1mgatM3swxAs8TKOoDQ+tYb0cnJMinAfDFrdXXaKwUCgYEAtaj3iaqHpY+msJdh7EKrpQWVnTuPA0yL5V64YYGE+uzITTnsK/r//Fs/9+va3UPU8E8kihmn3zquLms4v0udmHnq9AxI5jPqPZzW5jeHyrkuCQSR2Nt7ahYQdWVSILWH0oAtXKcRm4KrI8LMLtHHWHl0OtPqucYi+Lu3wDFwQGUCgYAry2kPwj7FkpY7kX+1AyW+gje+Y2lw2zJJ92DWJTnWb8SB9C1HH+2a2Pdr6NKR3ja2l2bqMxhWJBluZo76nJBO+QBGnlCUFbOYcHb7+NVLjytrnAnAu5feHigeyx3D5CJt+YhUmlakfqwJm+ashQ1s6uEsK2I4Tg1LZ2k58MXLCQKBgAd+C4+a//M9JIPeCoTjDw9EVrJgdXqOWqrAKFylKeXrhCtjOzFpLcuru8yu5pz/ojWzHe+wNTNIyUxS0claBgr25FDifNM5yux1notqOOiMkLCAhr9p9gIfHNiqsCN3OT3eWYCbx2chkYttClzX/B/TCo8ulFzLJkAaBe8gWt/dAoGAaA+XFXbS0PWNVfeYD4WAip6UgY1OxoM/BeQsTQr4IyDv1FCeRY+qE5tYwacfz8FNZr6TbPsFhj2K/RD6dhjgHw+qo+wOsRErQJ6neXmF7gvjFrDgvrsvzQrJLVinZzlZ0tfDlCD6EmjonBJDuUKVEU/KznAfX7dDqMReiWz2PYY=-----END RSA PRIVATE KEY-----";

const ppkA = EcPpk.fromPem(PEM_A);
const ppkB = EcPpk.fromPem(PEM_B);
const pkA = ppkA.toPk();
const pkB = ppkB.toPk();

function identity(ppk, name) {
    const i = new EcIdentity();
    i.ppk = ppk;
    i.displayName = name;
    i.source = 'src-' + name;
    return i;
}
function contact(pk, name) {
    const c = new EcContact();
    c.pk = pk;
    c.displayName = name;
    c.source = 'src-' + name;
    return c;
}

// readContacts/saveContacts use localStorage without a guard; give Node a plain object for it.
let createdStorage = false;
let savedStorage = null;
function useStorage() {
    if (typeof localStorage === 'undefined') {
        global.localStorage = {};
        createdStorage = true;
    }
    savedStorage = { contacts: localStorage["contacts"], identities: localStorage["identities"] };
    return localStorage;
}
function restoreStorage() {
    if (savedStorage == null) return;
    if (createdStorage) {
        savedStorage = null;
        delete global.localStorage;
        createdStorage = false;
        return;
    }
    for (const k of ['contacts', 'identities']) {
        if (savedStorage[k] === undefined) delete localStorage[k];
        else localStorage[k] = savedStorage[k];
    }
    savedStorage = null;
}

describe('EcIdentityManager key handling', () => {
    afterEach(() => {
        sinon.restore();
        restoreStorage();
    });

    it('starts empty', () => {
        const eim = new EcIdentityManager();
        assert.deepEqual(eim.ids, []);
        assert.deepEqual(eim.contacts, []);
        assert.isString(eim.eimId);
        assert.isFalse(eim.signatureSheetCaching);
        assert.notEqual(new EcIdentityManager().eimId, eim.eimId);
    });

    describe('local storage', () => {
        it('readContacts does nothing without stored contacts', () => {
            const store = useStorage();
            delete store["contacts"];
            const eim = new EcIdentityManager();
            eim.readContacts();
            assert.deepEqual(eim.contacts, []);
        });
        it('readContacts adds stored contacts that are not already known', () => {
            const store = useStorage();
            store["contacts"] = JSON.stringify([
                { displayName: 'A', pk: pkA.toPem(), source: 's1' },
                { displayName: 'B', pk: pkB.toPem(), source: 's2' },
                { displayName: 'B again', pk: pkB.toPem(), source: 's3' },
            ]);
            const eim = new EcIdentityManager();
            const existing = contact(pkA, 'mine');
            eim.contacts.push(existing);
            eim.readContacts();
            assert.equal(eim.contacts.length, 2);
            assert.strictEqual(eim.contacts[0], existing);
            assert.instanceOf(eim.contacts[1], EcContact);
            assert.equal(eim.contacts[1].displayName, 'B');
            assert.equal(eim.contacts[1].source, 's2');
            assert.equal(eim.contacts[1].pk.toPem(), pkB.toPem());
        });
        it('saveContacts writes name, key and source', () => {
            const store = useStorage();
            const eim = new EcIdentityManager();
            eim.contacts.push(contact(pkA, 'A'), contact(pkB, 'B'));
            eim.saveContacts();
            assert.deepEqual(JSON.parse(store["contacts"]), [
                { displayName: 'A', pk: pkA.toPem(), source: 'src-A' },
                { displayName: 'B', pk: pkB.toPem(), source: 'src-B' },
            ]);
            eim.contacts = [];
            eim.saveContacts();
            assert.equal(store["contacts"], '[]');
        });
        (isNode ? it : it.skip)('readIdentities and saveIdentities do nothing without localStorage', () => {
            const eim = new EcIdentityManager();
            eim.ids.push(identity(ppkA, 'A'));
            eim.readIdentities();
            eim.saveIdentities();
            assert.equal(eim.ids.length, 1);
            assert.equal(typeof localStorage, 'undefined');
        });
        it('readIdentities adds stored identities that are not already known', () => {
            const store = useStorage();
            delete store["identities"];
            const eim = new EcIdentityManager();
            eim.readIdentities();
            assert.deepEqual(eim.ids, []);
            store["identities"] = JSON.stringify([
                { displayName: 'A', ppk: PEM_A, source: 's1' },
                { displayName: 'B', ppk: PEM_B, source: 's2' },
                { displayName: 'B again', ppk: PEM_B, source: 's3' },
            ]);
            const existing = identity(ppkA, 'mine');
            eim.ids.push(existing);
            eim.readIdentities();
            assert.equal(eim.ids.length, 2);
            assert.strictEqual(eim.ids[0], existing);
            assert.instanceOf(eim.ids[1], EcIdentity);
            assert.equal(eim.ids[1].displayName, 'B');
            assert.equal(eim.ids[1].source, 's2');
            assert.equal(eim.ids[1].ppk.toPem(), PEM_B);
        });
        it('saveIdentities writes name, key and source', () => {
            const store = useStorage();
            const eim = new EcIdentityManager();
            eim.ids.push(identity(ppkA, 'A'), identity(ppkB, 'B'));
            eim.saveIdentities();
            assert.deepEqual(JSON.parse(store["identities"]), [
                { displayName: 'A', ppk: PEM_A, source: 'src-A' },
                { displayName: 'B', ppk: PEM_B, source: 'src-B' },
            ]);
        });
    });

    describe('adding identities and contacts', () => {
        it('addIdentity skips duplicates and fires the hook for new ones', () => {
            const eim = new EcIdentityManager();
            const hook = sinon.spy();
            eim.onIdentityChanged = hook;
            const a = identity(ppkA, 'A');
            eim.addIdentity(a);
            eim.addIdentity(identity(ppkA, 'A2'));
            eim.addIdentity(identity(ppkB, 'B'));
            assert.equal(eim.ids.length, 2);
            assert.strictEqual(eim.ids[0], a);
            assert.equal(hook.callCount, 2);
            assert.strictEqual(hook.firstCall.args[0], a);
        });
        it('addIdentityQuietly skips duplicates and fires no hook', () => {
            const eim = new EcIdentityManager();
            const hook = sinon.spy();
            eim.onIdentityChanged = hook;
            eim.addIdentityQuietly(identity(ppkA, 'A'));
            eim.addIdentityQuietly(identity(ppkA, 'A2'));
            eim.addIdentityQuietly(identity(ppkB, 'B'));
            assert.equal(eim.ids.length, 2);
            assert.equal(eim.ids[0].displayName, 'A');
            assert.equal(hook.callCount, 0);
        });
        it('addContact renames a matching identity and contact, and adds new contacts', () => {
            const store = useStorage();
            const eim = new EcIdentityManager();
            const idHook = sinon.spy();
            const contactHook = sinon.spy();
            eim.onIdentityChanged = idHook;
            eim.onContactChanged = contactHook;
            const id = identity(ppkA, 'me');
            eim.ids.push(id);
            const existing = contact(pkB, 'old');
            eim.contacts.push(existing);

            eim.addContact(contact(pkA, 'renamed me'));
            assert.equal(id.displayName, 'renamed me');
            assert.equal(idHook.callCount, 1);
            assert.strictEqual(idHook.firstCall.args[0], id);
            assert.equal(eim.contacts.length, 2);
            assert.equal(contactHook.callCount, 1);

            eim.addContact(contact(pkB, 'new name'));
            assert.equal(existing.displayName, 'new name');
            assert.equal(eim.contacts.length, 2);
            assert.equal(contactHook.callCount, 2);
            assert.strictEqual(contactHook.lastCall.args[0], existing);
            assert.equal(JSON.parse(store["contacts"]).length, 2);
        });
        it('addContactQuietly renames matches and adds new contacts without hooks', () => {
            const eim = new EcIdentityManager();
            const idHook = sinon.spy();
            const contactHook = sinon.spy();
            eim.onIdentityChanged = idHook;
            eim.onContactChanged = contactHook;
            const id = identity(ppkA, 'me');
            eim.ids.push(id);
            const existing = contact(pkB, 'old');
            eim.contacts.push(existing);
            eim.addContactQuietly(contact(pkA, 'renamed me'));
            assert.equal(id.displayName, 'renamed me');
            assert.equal(eim.contacts.length, 2);
            eim.addContactQuietly(contact(pkB, 'new name'));
            assert.equal(existing.displayName, 'new name');
            assert.equal(eim.contacts.length, 2);
            assert.equal(idHook.callCount, 0);
            assert.equal(contactHook.callCount, 0);
        });
    });

    describe('lookups', () => {
        it('getPpk, getContact and getIdentity find by key or return null', () => {
            const eim = new EcIdentityManager();
            const a = identity(ppkA, 'A');
            const cb = contact(pkB, 'B');
            eim.ids.push(a);
            eim.contacts.push(cb);
            assert.strictEqual(eim.getPpk(pkA), ppkA);
            assert.isNull(eim.getPpk(pkB));
            assert.strictEqual(eim.getContact(pkB), cb);
            assert.isNull(eim.getContact(pkA));
            assert.strictEqual(eim.getIdentity(pkA), a);
            assert.isNull(eim.getIdentity(pkB));
        });
        it('myIdentitiesSearchString escapes the field prefix', () => {
            const eim = new EcIdentityManager();
            assert.equal(eim.myIdentitiesSearchString(), '');
            eim.ids.push(identity(ppkA, 'A'), identity(ppkB, 'B'));
            const a = pkA.toPem(), b = pkB.toPem();
            assert.equal(eim.myIdentitiesSearchString(),
                '\\*reader:"' + a + '" OR \\*owner:"' + a + '" OR \\*reader:"' + b + '" OR \\*owner:"' + b + '"');
        });
        it('getMyPks returns public keys, or [] when ids is null', () => {
            const eim = new EcIdentityManager();
            eim.ids.push(identity(ppkA, 'A'), identity(ppkB, 'B'));
            assert.deepEqual(eim.getMyPks().map((x) => x.toPem()), [pkA.toPem(), pkB.toPem()]);
            eim.ids = null;
            assert.deepEqual(eim.getMyPks(), []);
        });
    });

    describe('signatures', () => {
        let fips;
        beforeEach(() => {
            fips = isNode ? process.env.FIPS : undefined;
        });
        afterEach(() => {
            if (!isNode) return;
            if (fips === undefined) delete process.env.FIPS;
            else process.env.FIPS = fips;
        });

        it('createSignature returns null for a facade', () => {
            const eim = new EcIdentityManager();
            assert.isNull(eim.createSignature(1000, 'srv', new EcPpkFacade(pkA)));
        });
        it('createSignature signs with SHA-1 or SHA-256', async () => {
            sinon.useFakeTimers({ now: 1000000, toFake: ['Date'] });
            if (isNode) sinon.stub(require('crypto'), 'getFips').returns(0);
            const sign = sinon.stub(EcRsaOaepAsyncWorker, 'sign').resolves('SIG1');
            const sign256 = sinon.stub(EcRsaOaepAsyncWorker, 'signSha256').resolves('SIG256');
            const eim = new EcIdentityManager();
            let s = await eim.createSignature(5000, 'srv', ppkA);
            assert.equal(sign.callCount, 1);
            assert.strictEqual(sign.firstCall.args[0], ppkA);
            const signed = JSON.parse(sign.firstCall.args[1]);
            assert.equal(signed.expiry, 1005000);
            assert.equal(signed.server, 'srv');
            assert.equal(signed['@owner'], pkA.toPem());
            assert.notProperty(signed, '@signature');
            assert.equal(s['@signature'], 'SIG1');
            assert.equal(s.expiry, 1005000);
            assert.notProperty(s, 'signature');
            assert.notProperty(s, 'owner');

            s = await eim.createSignature(5000, 'srv', ppkA, 'SHA-256');
            assert.equal(sign256.callCount, 1);
            assert.equal(s['@signatureSha256'], 'SIG256');
            assert.notProperty(s, '@signature');
            s = await eim.createSignature(5000, 'srv', ppkA, 'SHA-512');
            assert.equal(sign.callCount, 2);
        });
        (isNode ? it : it.skip)('createSignature forces SHA-256 when OpenSSL is in FIPS mode and FIPS was not requested', async () => {
            const getFips = sinon.stub(require('crypto'), 'getFips').returns(1);
            const sign = sinon.stub(EcRsaOaepAsyncWorker, 'sign').resolves('SIG1');
            const sign256 = sinon.stub(EcRsaOaepAsyncWorker, 'signSha256').resolves('SIG256');
            const eim = new EcIdentityManager();
            delete process.env.FIPS;
            assert.equal((await eim.createSignature(5000, 'srv', ppkA))['@signatureSha256'], 'SIG256');
            process.env.FIPS = '1';
            assert.equal((await eim.createSignature(5000, 'srv', ppkA))['@signature'], 'SIG1');
            delete process.env.FIPS;
            getFips.returns(0);
            assert.equal((await eim.createSignature(5000, 'srv', ppkA))['@signature'], 'SIG1');
            assert.equal(sign.callCount, 2);
            assert.equal(sign256.callCount, 1);
        });
        it('signatureSheet drops empty signatures and joins the rest', async () => {
            const eim = new EcIdentityManager();
            eim.ids.push(identity(ppkA, 'A'), identity(ppkB, 'B'));
            const create = sinon.stub(eim, 'createSignature');
            create.onCall(0).resolves({ s: 'a' });
            create.onCall(1).returns(null);
            let seen = null;
            const r = await eim.signatureSheet(1000, 'srv', (x) => { seen = x; return x; }, null, 'ALG');
            assert.equal(r, '[{"s":"a"}]');
            assert.equal(seen, r);
            assert.deepEqual(create.firstCall.args, [1000, 'srv', ppkA, 'ALG']);
            assert.deepEqual(eim.signatureSheetCache, {});
        });
        it('signatureSheet caches per server while the cache is fresh', async () => {
            const clock = sinon.useFakeTimers({ now: 1000000, toFake: ['Date'] });
            const eim = new EcIdentityManager();
            eim.signatureSheetCaching = true;
            eim.ids.push(identity(ppkA, 'A'));
            const create = sinon.stub(eim, 'createSignature').callsFake(async (d) => ({ d }));
            assert.equal(await eim.signatureSheet(1000, 'srv'), '[{"d":21000}]');
            assert.deepEqual(eim.signatureSheetCache['srv'], [1021000, '[{"d":21000}]']);
            assert.equal(await eim.signatureSheet(1000, 'srv'), '[{"d":21000}]');
            assert.equal(create.callCount, 1);
            clock.tick(20000);
            assert.equal(await eim.signatureSheet(1000, 'srv'), '[{"d":21000}]');
            assert.equal(create.callCount, 2);
            assert.deepEqual(eim.signatureSheetCache['srv'], [1041000, '[{"d":21000}]']);
            await eim.signatureSheet(1000, 'other');
            assert.equal(create.callCount, 3);
        });
        it('signatureSheetFor signs only with keys it owns', async () => {
            const eim = new EcIdentityManager();
            eim.ids.push(identity(ppkA, 'A'));
            const create = sinon.stub(eim, 'createSignature').callsFake(async (d, srv, ppk) => ({ d, k: ppk === ppkA }));
            const r = await eim.signatureSheetFor([pkB.toPem(), pkA.toPem()], 1000, 'srv', null, null, 'ALG');
            assert.equal(r, '[{"d":1000,"k":true}]');
            assert.equal(create.callCount, 1);
            assert.equal(create.firstCall.args[3], 'ALG');
            create.resolves(null);
            assert.equal(await eim.signatureSheetFor([pkA.toPem()], 1000, 'srv'), '[]');
            assert.equal(await eim.signatureSheetFor([], 1000, 'srv'), '[]');
        });
        it('signatureSheetFor caches per server while the cache is fresh', async () => {
            const clock = sinon.useFakeTimers({ now: 1000000, toFake: ['Date'] });
            const eim = new EcIdentityManager();
            eim.signatureSheetCaching = true;
            eim.ids.push(identity(ppkA, 'A'));
            const create = sinon.stub(eim, 'createSignature').callsFake(async (d) => ({ d }));
            assert.equal(await eim.signatureSheetFor([pkA.toPem()], 1000, 'srv'), '[{"d":21000}]');
            assert.deepEqual(eim.signatureSheetCache['srv'], [1021000, '[{"d":21000}]']);
            let seen = null;
            assert.equal(await eim.signatureSheetFor([pkB.toPem()], 1000, 'srv', (x) => { seen = x; return 'cb'; }), 'cb');
            assert.equal(seen, '[{"d":21000}]');
            assert.equal(create.callCount, 1);
            clock.tick(20000);
            await eim.signatureSheetFor([pkA.toPem()], 1000, 'srv');
            assert.equal(create.callCount, 2);
            assert.deepEqual(eim.signatureSheetCache['srv'], [1041000, '[{"d":21000}]']);
        });
        it('sign signs with owned owner keys and clears empty signature lists', async () => {
            const eim = new EcIdentityManager();
            eim.ids.push(identity(ppkA, 'A'));
            const d = new EcRemoteLinkedData('http://ctx/', 'Thing');
            d.owner = [pkB.toPem(), pkA.toPem()];
            const signWith = sinon.stub(d, 'signWith').resolves('SIG');
            assert.strictEqual(await eim.sign(d), d);
            assert.deepEqual(d.signatureSha256, ['SIG']);
            assert.equal(signWith.callCount, 1);
            assert.strictEqual(signWith.firstCall.args[0], ppkA);

            signWith.resolves(undefined);
            d.signature = ['old'];
            await eim.sign(d);
            assert.notProperty(d, 'signatureSha256');
            assert.notProperty(d, 'signature');

            const e = new EcRemoteLinkedData('http://ctx/', 'Thing');
            e.signature = ['old'];
            delete e.owner;
            await eim.sign(e);
            assert.notProperty(e, 'signatureSha256');
            assert.notProperty(e, 'signature');
        });
    });
});

describe('EcContactGrant.valid', () => {
    afterEach(() => sinon.restore());
    function grant(verified, invalid) {
        const g = new EcContactGrant();
        g.responseToken = 'token';
        g.responseSignature = 'sig';
        sinon.stub(g, 'verify').returns(verified);
        sinon.stub(g, 'invalid').returns(invalid);
        return g;
    }
    it('is false when the grant does not verify or is invalid', () => {
        const verify = sinon.stub(EcRsaOaep, 'verify').returns(true);
        const eim = new EcIdentityManager();
        eim.ids.push(identity(ppkA, 'A'));
        assert.isFalse(grant(false, false).valid(eim));
        assert.isFalse(grant(true, true).valid(eim));
        assert.equal(verify.callCount, 0);
    });
    it('is false with no identities', () => {
        sinon.stub(EcRsaOaep, 'verify').returns(true);
        assert.isFalse(grant(true, false).valid(new EcIdentityManager()));
    });
    it('checks the response signature against every identity', () => {
        const verify = sinon.stub(EcRsaOaep, 'verify').callsFake((pk) => pk.toPem() == pkA.toPem());
        const eim = new EcIdentityManager();
        eim.ids.push(identity(ppkA, 'A'), identity(ppkB, 'B'));
        assert.isTrue(grant(true, false).valid(eim));
        assert.equal(verify.callCount, 2);
        assert.deepEqual(verify.firstCall.args.slice(1), ['token', 'sig']);
        assert.equal(verify.secondCall.args[0].toPem(), pkB.toPem());
        eim.ids.shift();
        assert.isFalse(grant(true, false).valid(eim));
    });
});
