require('../../index.js');
const chai = require('chai');
const sinon = require('sinon');
const realCrypto = require('crypto');
const EcCrypto = require('../com/eduworks/ec/crypto/EcCrypto.js');

const assert = chai.assert;

const UUID = /^[0-9a-f]{8}-c455-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

// Fixes the clock and the random source (whichever one the implementation uses) to
// the nibble k, so the output is deterministic.
function withFixedEntropy(k, fn) {
    const clock = sinon.useFakeTimers({ now: 1700000000000 });
    const stubs = [sinon.stub(Math, 'random').returns(k / 16)];
    const fill = (array) => { array.fill(k); return array; };
    stubs.push(sinon.stub(globalThis.crypto, 'getRandomValues').callsFake(fill));
    // Bundled for the browser, the crypto module has no webcrypto.
    if (realCrypto.webcrypto && realCrypto.webcrypto !== globalThis.crypto)
        stubs.push(sinon.stub(realCrypto.webcrypto, 'getRandomValues').callsFake(fill));
    try {
        return fn();
    } finally {
        stubs.forEach((s) => s.restore());
        clock.restore();
    }
}

for (const [name, generate] of [['EcCrypto.generateUUID', () => EcCrypto.generateUUID()], ['global.generateUUID', () => global.generateUUID()]]) {
    describe(name, () => {
        it('has the c455 version-4 layout', () => {
            for (let i = 0; i < 200; i++)
                assert.match(generate(), UUID);
        });
        it('does not repeat', () => {
            const seen = new Set();
            for (let i = 0; i < 2000; i++)
                seen.add(generate());
            assert.equal(seen.size, 2000);
        });
        it('mixes the timestamp into the leading digits', () => {
            assert.equal(withFixedEntropy(0, generate), '00865efc-c455-4b81-8000-000000000000');
            assert.equal(withFixedEntropy(9, generate), '991fe785-c455-441a-9999-999999999999');
            assert.equal(withFixedEntropy(15, generate), 'ff754deb-c455-4a70-bfff-ffffffffffff');
        });
    });
}
