require('../../index.js');
const chai = require('chai');
const sinon = require('sinon');
const EcAssertion = require('../org/cass/profile/EcAssertion.js');
const Assertion = require('../org/cassproject/schema/cass/profile/Assertion.js');

const assert = chai.assert;

const GETTERS = ['getSubject', 'getAgent', 'getAssertionDate', 'getExpirationDate', 'getEvidences', 'getNegative', 'getDecayFunction'];
const fakePk = (pem) => ({ toPem: () => pem });
// copyFrom revives these fields as EcEncryptedValues, so give each a recognisable payload.
const sealed = (payload) => ({ "@type": "EncryptedValue", "@context": "https://schema.cassproject.org/kbac/0.4", payload });

function newAssertion() {
    const a = new EcAssertion();
    a.competency = 'https://x/competency';
    a.level = 'https://x/level';
    a.confidence = 0.75;
    a.subject = sealed('subject');
    a.agent = sealed('agent');
    a.assertionDate = sealed('date');
    a.expirationDate = sealed('expiration');
    a.evidence = [sealed('evidence')];
    a.negative = sealed('negative');
    a.decayFunction = sealed('decay');
    return a;
}

describe('EcAssertion.decrypt', () => {
    afterEach(() => sinon.restore());

    it('returns a plain Assertion with the decrypted fields', async () => {
        const a = newAssertion();
        sinon.stub(a, 'getSubject').resolves(fakePk('SUBJECT'));
        sinon.stub(a, 'getAgent').resolves(fakePk('AGENT'));
        sinon.stub(a, 'getAssertionDate').resolves(123);
        sinon.stub(a, 'getExpirationDate').resolves(456);
        sinon.stub(a, 'getEvidences').resolves(['e1', 'e2']);
        sinon.stub(a, 'getNegative').resolves(true);
        sinon.stub(a, 'getDecayFunction').resolves('t');
        const d = await a.decrypt();
        assert.instanceOf(d, Assertion);
        assert.notInstanceOf(d, EcAssertion);
        assert.equal(d.subject, 'SUBJECT');
        assert.equal(d.agent, 'AGENT');
        assert.equal(d.assertionDate, 123);
        assert.equal(d.expirationDate, 456);
        assert.deepEqual(d.evidence, ['e1', 'e2']);
        assert.strictEqual(d.negative, true);
        assert.equal(d.decayFunction, 't');
        assert.equal(d.competency, 'https://x/competency');
        assert.equal(d.level, 'https://x/level');
        assert.equal(d.confidence, 0.75);
    });

    it('keeps the copied value when a getter resolves to something falsy', async () => {
        const a = newAssertion();
        sinon.stub(a, 'getSubject').resolves(null);
        sinon.stub(a, 'getAgent').resolves(undefined);
        sinon.stub(a, 'getAssertionDate').resolves(0);
        sinon.stub(a, 'getExpirationDate').resolves(null);
        sinon.stub(a, 'getEvidences').resolves(null);
        sinon.stub(a, 'getNegative').resolves(false);
        sinon.stub(a, 'getDecayFunction').resolves('');
        const d = await a.decrypt();
        assert.equal(d.subject.payload, 'subject');
        assert.equal(d.agent.payload, 'agent');
        assert.equal(d.assertionDate.payload, 'date');
        assert.equal(d.expirationDate.payload, 'expiration');
        assert.equal(d.evidence[0].payload, 'evidence');
        assert.equal(d.negative.payload, 'negative');
        assert.equal(d.decayFunction.payload, 'decay');
    });

    it('starts every decryption before waiting on any of them', async () => {
        const a = newAssertion();
        let release;
        const gate = new Promise((resolve) => { release = resolve; });
        const stubs = GETTERS.map((g) => sinon.stub(a, g).returns(gate.then(() => null)));
        const eim = {};
        const pending = a.decrypt(eim);
        for (const s of stubs) {
            assert.isTrue(s.calledOnce, s.toString());
            assert.strictEqual(s.firstCall.args[0], eim);
        }
        release();
        await pending;
    });

    it('rejects when a decryption fails', async () => {
        const a = newAssertion();
        for (const g of GETTERS) sinon.stub(a, g).resolves(null);
        a.getAgent.rejects(new Error('agent failed'));
        let error;
        try { await a.decrypt(); } catch (e) { error = e; }
        assert.equal(error && error.message, 'agent failed');
    });
});
