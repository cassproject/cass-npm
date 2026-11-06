require('../../index.js');
const chai = require('chai');
const Ebac = require('../org/cassproject/schema/general/Ebac.js');

const assert = chai.assert;

const classes = {
    EbacContact: require('../com/eduworks/schema/ebac/EbacContact.js'),
    EbacContactGrant: require('../com/eduworks/schema/ebac/EbacContactGrant.js'),
    EbacCredential: require('../com/eduworks/schema/ebac/EbacCredential.js'),
    EbacCredentialCommit: require('../com/eduworks/schema/ebac/EbacCredentialCommit.js'),
    EbacCredentialRequest: require('../com/eduworks/schema/ebac/EbacCredentialRequest.js'),
    EbacCredentials: require('../com/eduworks/schema/ebac/EbacCredentials.js'),
    EbacEncryptedSecret: require('../com/eduworks/schema/ebac/EbacEncryptedSecret.js'),
    EbacEncryptedValue: require('../com/eduworks/schema/ebac/EbacEncryptedValue.js'),
};
const EbacSignature = require('../com/eduworks/schema/ebac/EbacSignature.js');

const SCHEMA = 'http://schema.eduworks.com/ebac/0.1/';

function legacy(C, type) {
    const o = new C();
    o.type = type;
    delete o['@context'];
    delete o['@type'];
    return o;
}

describe('Ebac schema classes', () => {
    for (const [name, C] of Object.entries(classes)) {
        describe(name, () => {
            it('getTypes lists the types newest first', () => {
                const a = new C().getTypes();
                assert.deepEqual(a, [C.TYPE_0_4, C.TYPE_0_3, C.TYPE_0_2, C.TYPE_0_1]);
                assert.notStrictEqual(new C().getTypes(), a);
            });
            it('upgrades a 0.1 object, copying @schema into a missing @context', () => {
                const o = legacy(C, C.TYPE_0_1);
                o['@schema'] = SCHEMA;
                o.upgrade();
                assert.equal(o['@context'], SCHEMA);
                assert.equal(o.context, Ebac.context_0_4);
                assert.equal(o.getFullType(), C.TYPE_0_4);
                assert.equal(o.getFullType(), C.TYPE_0_4);
            });
            it('upgrade keeps an existing @context', () => {
                const o = legacy(C, C.TYPE_0_1);
                o['@schema'] = SCHEMA;
                o['@context'] = 'keep';
                o.upgrade();
                assert.equal(o['@context'], 'keep');
                assert.equal(o.getFullType(), C.TYPE_0_4);
            });
            it('upgrade without @schema leaves @context unset', () => {
                const o = legacy(C, C.TYPE_0_1);
                o.upgrade();
                assert.isUndefined(o['@context']);
                assert.equal(o.getFullType(), C.TYPE_0_4);
            });
            it('upgrades 0.3 objects to 0.4', () => {
                const o = new C();
                o.setContextAndType(Ebac.context_0_3, C.TYPE_0_3);
                o.upgrade();
                assert.equal(o.context, Ebac.context_0_4);
                assert.equal(o.getFullType(), C.TYPE_0_4);
            });
        });
    }

    it('EbacContact 0.1 and 0.2 types are the same IRI', () => {
        assert.equal(classes.EbacContact.TYPE_0_1, classes.EbacContact.TYPE_0_2);
    });

    describe('EbacSignature', () => {
        it('getTypes lists the types newest first', () => {
            assert.deepEqual(new EbacSignature().getTypes(), [EbacSignature.TYPE_0_4, EbacSignature.TYPE_0_3, EbacSignature.TYPE_0_2, EbacSignature.TYPE_0_1]);
        });
        it('upgrade does not change legacy types', () => {
            const o = legacy(EbacSignature, EbacSignature.TYPE_0_1);
            o['@schema'] = SCHEMA;
            o.upgrade();
            assert.equal(o.type, EbacSignature.TYPE_0_1);
            assert.isUndefined(o['@context']);
        });
    });

    describe('EbacEncryptedValue.copyFrom', () => {
        const C = classes.EbacEncryptedValue;
        it('replaces all fields and strips the leading @ from keys', () => {
            const v = new C();
            v.extra = 1;
            v.copyFrom({ "@type": "EncryptedValue", "@context": Ebac.context_0_4, payload: "p", "@owner": ["a"], "x@y": 2 });
            assert.notProperty(v, 'extra');
            assert.notProperty(v, 'iv');
            assert.equal(v.type, "EncryptedValue");
            assert.equal(v.context, Ebac.context_0_4);
            assert.equal(v.payload, "p");
            assert.deepEqual(v.owner, ["a"]);
            assert.equal(v.xy, 2);
            assert.deepEqual(Object.keys(v).sort(), ['context', 'owner', 'payload', 'type', 'xy']);
        });
        it('throws for an incompatible type', () => {
            const v = new C();
            assert.throws(() => v.copyFrom({ "@type": "Thing", "@context": "https://schema.org/" }), Error, "Incompatible type: https://schema.org/Thing");
        });
    });
});
