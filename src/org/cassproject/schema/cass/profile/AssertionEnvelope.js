const Cass = require("../Cass");

/**
 *  Container for storing assertions and the secrets used to decrypt those assertions.
 *
 *  @author fritz.ray@eduworks.com
 *  @class AssertionEnvelope
 *  @extends CreativeWork
 *  @module org.cassproject
 */
module.exports = class AssertionEnvelope extends schema.CreativeWork {
	constructor() {
		super();
		this.setContextAndType(Cass.context, AssertionEnvelope.myType);
	}
	static TYPE_0_5 = "http://schema.cassproject.org/0.4/AssertionEnvelope";
	static TYPE_0_6 = "https://schema.cassproject.org/0.4/AssertionEnvelope";
	static myType = this.TYPE_0_6;
	/**
	 *  List of assertions to pack in the envelope.
	 *
	 *  @property assertion
	 *  @type Assertion[]
	 */
	assertion = null;
	/**
	 *  List of secrets found in assertions to the objects necessary to decrypt the assertion data.
	 *
	 *  @property codebook
	 *  @type AssertionCodebook[]
	 */
	codebook = null;
	length() {
		if (this.assertion != null) return this.assertion.length;
		return 0;
	}
	/**
	 *  Removes an assertion from the envelope
	 *  @param assertionShortIdToRemove
	 *  @method removeAssertionByShortId
	 */
	removeAssertionByShortId(assertionShortIdToRemove) {
		if (this.assertion != null) {
			for (let i = 0; i < this.assertion.length; i++) {
				if (
					this.getAssertion(i)
						.shortId()
						.equals(assertionShortIdToRemove)
				) {
					this.assertion.splice(i, 1);
					break;
				}
			}
		}
		if (this.codebook != null) {
			for (let i = 0; i < this.codebook.length; i++) {
				if (
					this.codebook[i].assertionShortId.equals(
						assertionShortIdToRemove
					)
				) {
					this.codebook.splice(i, 1);
					break;
				}
			}
		}
	}
	/**
	 *  Returns the assertion indexed at position @index.
	 *  @param index
	 *  @method getAssertion
	 *  @return
	 */
	getAssertion(index) {
		if (this.assertion != null)
			if (index < this.assertion.length) {
				if (Assertion.codebooks == null) Assertion.codebooks = {};
				let a = new Assertion();
				a.copyFrom(this.assertion[index]);
				Assertion.codebooks[a.id] = this.codebook[index];
				return a;
			}
		return null;
	}
	/**
	 *  Adds the assertion to the envelope and adds the keys necessary to decode the assertion to the envelope.
	 *  @param a Assertion to add.
	 *  @method addAssertion
	 */
	async addAssertion(a, eim) {
		let ac = new AssertionCodebook();
		if (this.assertion == null) this.assertion = [];
		this.assertion.push(a);
		if (this.codebook == null) this.codebook = [];
		this.codebook.push(ac);
		if (a.shortId() != null) ac.assertionShortId = a.shortId();
		if (a.agent != null) ac.agent = await a.agent.decryptSecret(eim);
		if (a.subject != null) ac.subject = await a.subject.decryptSecret(eim);
		if (a.assertionDate != null)
			ac.assertionDate = await a.assertionDate.decryptSecret(eim);
		if (a.expirationDate != null)
			ac.expirationDate = await a.expirationDate.decryptSecret(eim);
		if (a.decayFunction != null)
			ac.decayFunction = await a.decayFunction.decryptSecret(eim);
		if (a.negative != null) ac.negative = await a.negative.decryptSecret(eim);
		if (a.evidence != null)
			for (let ecEncryptedValue of a.evidence) {
				if (ac.evidence == null) ac.evidence = [];
				ac.evidence.push(await ecEncryptedValue.decryptSecret(eim));
			}
	}
	/**
	 *  Validates that all assertions have not been tampered with (are authentic).
	 *  Does not validate the sources of assertions.
	 *  @return True IFF assertions are authentic.
	 *  @method validate
	 */
	validate() {
		if (this.assertion != null)
			for (let assertion of this.assertion)
				if (assertion.invalid()) return false;
		return true;
	}
};
