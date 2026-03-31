const EcPk = require("../../../com/eduworks/ec/crypto/EcPk");
const EcIdentityManager = require("../../cassproject/ebac/identity/EcIdentityManager");
const EcEncryptedValue = require("../../cassproject/ebac/repository/EcEncryptedValue");
const EcRepository = require("../../cassproject/ebac/repository/EcRepository");
const Assertion = require("../../cassproject/schema/cass/profile/Assertion");

/**
 *  The sequence that assertions should be built as such: 1. Generate the ID. 2.
 *  Add the owner. 3. Set the subject. 4. Set the agent. Further functions may be
 *  called afterwards in any order. WARNING: The modifications of ownership and
 *  readership do not "just work".
 *
 *  @author fritz.ray@eduworks.com
 */
module.exports = class EcAssertion extends Assertion {
	equals(obj) {
		return this.isId(obj.id);
	}
	async decrypt(eim) {
		eim = eim || EcIdentityManager.default;
		let a = new Assertion().copyFrom(this);
		if (a.subject != null)
		a.setSubject(await this.getSubject(eim));
		if (a.agent != null)
		a.setAgent(await this.getAgent(eim));
		if (a.assertionDate != null)
		a.setAssertionDate(await this.getAssertionDate(eim));
		if (a.expirationDate != null)
		a.setExpirationDate(await this.getExpirationDate(eim));
		if (a.evidence != null)
		a.setEvidence(await this.getEvidences(eim));
		if (a.negative != null)
		a.setNegative(await this.getNegative(eim));
		if (a.decayFunction != null)
		a.setDecayFunction(await this.getDecayFunction(eim));
		a.setCompetency(this.competency);
		a.setLevel(this.level);
		a.setConfidence(this.confidence);
		return a;
	}
	static get(id, success, failure, repo, eim) {
		return EcRepository.getAs(id, new EcAssertion(), success, failure, repo, eim);
	}
	static search(repo, query, success, failure, paramObj, eim) {
		return EcRepository.searchAs(
			repo,
			query,
			function () {
				return new EcAssertion();
			},
			success,
			failure,
			paramObj, eim
		);
	}
	async getSubject(eim) {
		if (this.subject == null) return null;
		if (!eim) {
			eim = EcIdentityManager.default;
		}
		let v = new EcEncryptedValue();
		v.copyFrom(this.subject);
		let codebook = Assertion.getCodebook(this);
		let decryptedString;
		if (codebook != null)
			decryptedString = await v
				.decryptIntoStringUsingSecret(codebook.subject)
				.catch((error) => null);
		else {
			decryptedString = await v
				.decryptIntoString(null, null, eim)
				.catch((error) => null);
		}
		if (decryptedString == null) return null;
		return EcPk.fromPem(decryptedString);
	}
	/**
	 *  Sets the subject of an assertion. Makes a few assumptions: Owners of the
	 *  object should be able to see and change the encrypted value. Owners and
	 *  readers of the object should be persisted.
	 *
	 *  @param pk
	 */
	async setSubject(pk) {
		let owners = [];
		let readers = null;
		if (this.reader == null) 
			readers = [];
		else 
			readers = JSON.parse(JSON.stringify(this.reader));
		if (this.subject != null) {
			if (this.subject.owner != null) 
				owners = owners.concat(this.subject.owner);
			if (this.subject.reader != null)
				readers = readers.concat(this.subject.reader);
		}
		if (this.owner != null) owners = owners.concat(this.owner);
		readers.push(pk.toPem());
		this.subject = await EcEncryptedValue.encryptValue(
			pk.toPem(),
			this.id,
			owners,
			readers
		);
	}
	// @deprecated
	setSubjectAsync(pk, success, failure) {
		let me = this;
		let owners = [];
		let readers = null;
		if (this.reader == null) 
			readers = [];
		else 
			readers = JSON.parse(JSON.stringify(this.reader));
		if (this.subject != null) {
			if (this.subject.owner != null) 
				owners = owners.concat(this.subject.owner);
			if (this.subject.reader != null)
				readers = readers.concat(this.subject.reader);
		}
		if (this.owner != null) owners = owners.concat(this.owner);
		readers.push(pk.toPem());
		return EcEncryptedValue.encryptValueAsync(
			pk.toPem(),
			this.id,
			owners,
			readers,
			function (subject) {
				me.subject = subject;
				success();
			},
			failure
		);
	}
	// @deprecated
	getSubjectAsync(success, failure, eim) {
		if (this.subject == null) {
			success(null);
			return;
		}
		let v = new EcEncryptedValue();
		v.copyFrom(this.subject);
		let decrypted = function (decryptedString) {
			if (decryptedString == null) failure("Could not decrypt subject.");
			else success(EcPk.fromPem(decryptedString));
		};
		let codebook = Assertion.getCodebook(this);
		if (codebook != null)
			return v.decryptIntoStringUsingSecretAsync(
				codebook.subject,
				decrypted,
				failure
			);
		else return v.decryptIntoString(decrypted, failure, eim);
	}
	async getAgent(eim) {
		if (this.agent == null) return null;
		if (!eim) {
			eim = EcIdentityManager.default;
		}
		let v = new EcEncryptedValue();
		v.copyFrom(this.agent);
		let codebook = Assertion.getCodebook(this);
		let decryptedString;
		if (codebook != null)
			decryptedString = await v
				.decryptIntoStringUsingSecret(codebook.agent)
				.catch((error) => null);
		else {
			decryptedString = await v
				.decryptIntoString(null, null, eim)
				.catch((error) => null);
		}
		if (decryptedString == null) return null;
		return EcPk.fromPem(decryptedString);
	}
	async setAgent(pk) {
		this.agent = await EcEncryptedValue.encryptValue(
			pk.toPem(),
			this.id,
			this.subject.owner,
			this.subject.reader
		);
	}
	// @deprecated
	setAgentAsync(pk, success, failure) {
		let me = this;
		return EcEncryptedValue.encryptValueAsync(
			pk.toPem(),
			this.id,
			this.subject.owner,
			this.subject.reader,
			function (agent) {
				me.agent = agent;
				success();
			},
			failure
		);
	}
	// @deprecated
	getAgentAsync(success, failure, eim) {
		if (this.agent == null) {
			success(null);
			return;
		}
		let v = new EcEncryptedValue();
		v.copyFrom(this.agent);
		let decrypted = function (decryptedString) {
			if (decryptedString == null) failure("Could not decrypt agent.");
			else success(EcPk.fromPem(decryptedString));
		};
		let codebook = Assertion.getCodebook(this);
		if (codebook != null)
			return v.decryptIntoStringUsingSecretAsync(
				codebook.agent,
				decrypted,
				failure
			);
		else return v.decryptIntoString(decrypted, failure, eim);
	}
	async getSubjectName(repo, eim) {
		if (this.subject == null) return "Nobody";
		let subjectPk = await this.getSubject(eim);
		if (subjectPk) {
			let name = await EcAssertion.getNameByPk(repo, subjectPk);
			if (name != null) return name;
		}
		return "Unknown Subject";
	}
	// @deprecated
	getSubjectNameAsync(success, failure) {
		if (this.subject == null) {
			success("Nobody");
			return;
		}
		return cassPromisify(
			this.getSubject().then((pk) => getNameByPk(pk, "Unknown Agent")),
			success,
			failure
		);
	}
	async getAgentName(repo, eim) {
		if (this.agent == null) return "Nobody";
		let agentPk = await this.getAgent(eim);
		if (agentPk) {
			let name = await EcAssertion.getNameByPk(repo, agentPk, "Unknown Agent");
			if (name != null) return name;
		}
		return "Unknown Agent";
	}
	// @deprecated
	getAgentNameAsync(success, failure) {
		if (this.subject == null) {
			success("Nobody");
			return;
		}
		return cassPromisify(
			this.getAgent().then((pk) => getNameByPk(pk, "Unknown Agent")),
			success,
			failure
		);
	}
	static async getNameByPk(repo, pk, dflt) {
		let p = await EcPerson.getByPk(repo, pk);
		if (p === undefined || p == null) return dflt;
		return p.getName();
	}
	async getAssertionDate(eim) {
		if (this.assertionDate == null) return null;
		let v = new EcEncryptedValue();
		v.copyFrom(this.assertionDate);
		let codebook = Assertion.getCodebook(this);
		let decryptedString;
		if (codebook != null)
			decryptedString = await v
				.decryptIntoStringUsingSecret(codebook.assertionDate)
				.catch((error) => null);
		else {
			decryptedString = await v
				.decryptIntoString(null, null, eim)
				.catch((error) => null);
		}
		if (decryptedString == null) return null;
		return parseInt(decryptedString);
	}
	async setAssertionDate(assertionDateMs) {
		this.assertionDate = await EcEncryptedValue.encryptValue(
			assertionDateMs.toString(),
			this.id,
			this.subject.owner,
			this.subject.reader
		);
	}
	// @deprecated
	setAssertionDateAsync(assertionDateMs, success, failure) {
		let me = this;
		return EcEncryptedValue.encryptValueAsync(
			assertionDateMs.toString(),
			this.id,
			this.subject.owner,
			this.subject.reader,
			function (assertionDate) {
				me.assertionDate = assertionDate;
				success();
			},
			failure
		);
	}
	// @deprecated
	getAssertionDateAsync(success, failure, eim) {
		if (this.assertionDate == null) {
			success(null);
			return;
		}
		let v = new EcEncryptedValue();
		v.copyFrom(this.assertionDate);
		let decrypted = function (decryptedString) {
			if (decryptedString == null)
				failure("Could not decrypt assertion date.");
			else success(parseInt(decryptedString));
		};
		let codebook = Assertion.getCodebook(this);
		if (codebook != null)
			return v.decryptIntoStringUsingSecretAsync(
				codebook.assertionDate,
				decrypted,
				failure
			);
		else return v.decryptIntoString(decrypted, failure, eim);
	}
	async getExpirationDate(eim) {
		if (this.expirationDate == null) return null;
		let v = new EcEncryptedValue();
		let codebook = Assertion.getCodebook(this);
		let decryptedString;
		v.copyFrom(this.expirationDate);
		if (codebook != null)
			decryptedString = await v
				.decryptIntoStringUsingSecret(codebook.expirationDate)
				.catch((error) => null);
		else {
			decryptedString = await v
				.decryptIntoString(null, null, eim)
				.catch((error) => null);
		}
		if (decryptedString == null) return null;
		return parseInt(decryptedString);
	}
	async setExpirationDate(expirationDateMs) {
		this.expirationDate = await EcEncryptedValue.encryptValue(
			expirationDateMs.toString(),
			this.id,
			this.subject.owner,
			this.subject.reader
		);
	}
	// @deprecated
	setExpirationDateAsync(expirationDateMs, success, failure) {
		let me = this;
		return EcEncryptedValue.encryptValueAsync(
			expirationDateMs.toString(),
			this.id,
			this.subject.owner,
			this.subject.reader,
			function (expirationDate) {
				me.expirationDate = expirationDate;
				success();
			},
			failure
		);
	}
	// @deprecated
	getExpirationDateAsync(success, failure, eim) {
		if (this.expirationDate == null) {
			success(null);
			return;
		}
		let v = new EcEncryptedValue();
		v.copyFrom(this.expirationDate);
		let decrypted = function (decryptedString) {
			if (decryptedString == null)
				failure("Could not decrypt expiration date.");
			else success(parseInt(decryptedString));
		};
		let codebook = Assertion.getCodebook(this);
		if (codebook != null)
			return v.decryptIntoStringUsingSecretAsync(
				codebook.expirationDate,
				decrypted,
				failure
			);
		else return v.decryptIntoString(decrypted, failure, eim);
	}
	getEvidenceCount() {
		if (this.evidence == null) return 0;
		return this.evidence.length;
	}
	async getEvidence(index, eim) {
		if (this.evidence === undefined || this.evidence == null)
			return null;
		let v = new EcEncryptedValue();
		v.copyFrom(this.evidence[index]);
		let codebook = Assertion.getCodebook(this);
		let decryptedString;
		if (codebook != null)
			decryptedString = await v
				.decryptIntoStringUsingSecret(codebook.evidence[index])
				.catch((error) => null);
		else {
			decryptedString = await v
				.decryptIntoString(null, null, eim)
				.catch((error) => null);
		}
		return decryptedString;
	}
	async getEvidences(eim) {
		if (this.evidence === undefined || this.evidence == null)
			return null;
		return Promise.all(this.evidence.map(async ev => {
			let v = new EcEncryptedValue();
			v.copyFrom(ev);
			let codebook = Assertion.getCodebook(this);
			let decryptedString;
			if (codebook != null)
				decryptedString = await v
					.decryptIntoStringUsingSecret(codebook.evidence[index])
					.catch((error) => null);
			else {
				decryptedString = await v
					.decryptIntoString(null, null, eim)
					.catch((error) => null);
			}
			return decryptedString;
		}));
	}
	// @deprecated
	getEvidencesAsync(success, failure, eim) {
		let evidences = this.evidence;
		if (evidences === undefined || evidences == null) evidences = [];
		return cassPromisify(
			Promise.all(
				evidences.map((evidence) => evidence.decryptIntoString(null, null, eim))
			),
			success,
			failure
		);
	}
	// @deprecated
	getEvidenceAsync(index, success, failure, eim) {
		if (this.evidence[index] == null) {
			success(null);
			return;
		}
		let v = new EcEncryptedValue();
		v.copyFrom(this.evidence[index]);
		let decrypted = function (decryptedString) {
			if (decryptedString == null) failure("Could not decrypt evidence.");
			else success(decryptedString);
		};
		let codebook = Assertion.getCodebook(this);
		if (codebook != null)
			return v.decryptIntoStringUsingSecretAsync(
				codebook.evidence[index],
				decrypted,
				failure
			);
		else return v.decryptIntoString(decrypted, failure, eim);
	}
	async getDecayFunction(eim) {
		if (this.decayFunction == null) return null;
		let v = new EcEncryptedValue();
		v.copyFrom(this.decayFunction);
		let codebook = Assertion.getCodebook(this);
		let decryptedString;
		if (codebook != null)
			decryptedString = await v
				.decryptIntoStringUsingSecret(codebook.decayFunction)
				.catch((error) => null);
		else {
			decryptedString = await v
				.decryptIntoString(null, null, eim)
				.catch((error) => null);
		}
		if (decryptedString == null) return null;
		return decryptedString;
	}
	async setDecayFunction(decayFunctionText) {
		this.decayFunction = await EcEncryptedValue.encryptValue(
			decayFunctionText.toString(),
			this.id,
			this.subject.owner,
			this.subject.reader
		);
	}
	// @deprecated
	setDecayFunctionAsync(decayFunctionText, success, failure) {
		let me = this;
		return EcEncryptedValue.encryptValueAsync(
			decayFunctionText,
			this.id,
			this.subject.owner,
			this.subject.reader,
			function (decayFunction) {
				me.decayFunction = decayFunction;
				success();
			},
			failure
		);
	}
	// @deprecated
	getDecayFunctionAsync(success, failure, eim) {
		if (this.decayFunction == null) {
			success(null);
			return;
		}
		let v = new EcEncryptedValue();
		v.copyFrom(this.decayFunction);
		let decrypted = function (decryptedString) {
			if (decryptedString == null)
				failure("Could not decrypt decay function.");
			else success(decryptedString);
		};
		let codebook = Assertion.getCodebook(this);
		if (codebook != null)
			return v.decryptIntoStringUsingSecretAsync(
				codebook.decayFunction,
				decrypted,
				failure
			);
		else return v.decryptIntoString(decrypted, failure, eim);
	}
	async getNegative(eim) {
		if (this.negative == null) return false;
		let v = new EcEncryptedValue();
		v.copyFrom(this.negative);
		let codebook = Assertion.getCodebook(this);
		let decryptedString;
		if (codebook != null)
			decryptedString = await v
				.decryptIntoStringUsingSecret(codebook.negative)
				.catch((error) => null);
		else {
			decryptedString = await v
				.decryptIntoString(null, null, eim)
				.catch((error) => null);
		}
		if (decryptedString != null) decryptedString.toLowerCase();
		return "true" == decryptedString;
	}
	async setNegative(negativeB) {
		this.negative = await EcEncryptedValue.encryptValue(
			negativeB.toString(),
			this.id,
			this.subject.owner,
			this.subject.reader
		);
	}
	// @deprecated
	setNegativeAsync(negativeB, success, failure) {
		let me = this;
		return EcEncryptedValue.encryptValueAsync(
			negativeB.toString(),
			this.id,
			this.subject.owner,
			this.subject.reader,
			function (negative) {
				me.negative = negative;
				success();
			},
			failure
		);
	}
	// @deprecated
	getNegativeAsync(success, failure, eim) {
		if (this.negative == null) {
			success(null);
			return;
		}
		let v = new EcEncryptedValue();
		v.copyFrom(this.negative);
		let decrypted = function (decryptedString) {
			if (decryptedString == null)
				if (decryptedString == null) {
					failure("Could not decrypt negative.");
					return;
				}
			if (decryptedString != null) decryptedString.toLowerCase();
			success("true".equals(decryptedString));
		};
		let codebook = Assertion.getCodebook(this);
		if (codebook != null)
			return v.decryptIntoStringUsingSecretAsync(
				codebook.negative,
				decrypted,
				failure
			);
		else return v.decryptIntoString(decrypted, failure, eim);
	}
	setCompetency(competencyUrl) {
		this.competency = competencyUrl;
	}
	setLevel(levelUrl) {
		this.level = levelUrl;
	}
	setConfidence(confidenceZeroToOne) {
		this.confidence = confidenceZeroToOne;
	}
	async setEvidence(evidences) {
		let encryptedValues = [];
		for (let i = 0; i < evidences.length; i++)
			encryptedValues.push(
				await EcEncryptedValue.encryptValue(
					evidences[i],
					this.id,
					this.subject.owner,
					this.subject.reader
				)
			);
		this.evidence = encryptedValues;
	}
	setEvidenceAsync(evidences, success, failure) {
		return cassPromisify(
			Promise.all(
				evidences
					.map((evidence) =>
						EcEncryptedValue.encryptValue(
							evidence,
							this.id,
							this.subject.owner,
							this.subject.reader
						)
					)
			).then((evidences) => {
				this.evidence = evidences;
			}),
			success,
			failure
		);
	}
	save(success, failure, repo, eim) {
		if (this.competency == null || this.competency == "") {
			let msg = "Failing to save: Competency cannot be missing";
			if (failure !== undefined && failure != null) failure(msg);
			else throw new Error(msg);
			return;
		}
		if (this.subject == null) {
			let msg = "Failing to save: Subject cannot be missing";
			if (failure !== undefined && failure != null) failure(msg);
			else throw new Error(msg);
			return;
		}
		if (this.agent == null) {
			let msg = "Failing to save: Agent cannot be missing";
			if (failure !== undefined && failure != null) failure(msg);
			else throw new Error(msg);
			return;
		}
		if (this.assertionDate == null) {
			let msg = "Failing to save: Assertion Date cannot be missing";
			if (failure !== undefined && failure != null) failure(msg);
			else throw new Error(msg);
			return;
		}
		if (repo == null) return EcRepository.save(this, success, failure, repo, eim);
		else return repo.saveTo(this, success, failure, eim);
	}
	async addReader(newReader, eim) {
		if (this.agent != null) {
			await this.agent.addReader(newReader, eim);
		}
		if (this.assertionDate != null) {
			await this.assertionDate.addReader(newReader, eim);
		}
		if (this.decayFunction != null) {
			await this.decayFunction.addReader(newReader, eim);
		}
		if (this.evidence != null)
			for (let i = 0; i < this.evidence.length; i++) {
				await this.evidence[i].addReader(newReader, eim);
			}
		if (this.expirationDate != null) {
			await this.expirationDate.addReader(newReader, eim);
		}
		if (this.negative != null) {
			await this.negative.addReader(newReader, eim);
		}
		if (this.subject != null) {
			await this.subject.addReader(newReader, eim);
		}
		await super.addReader(newReader);
	}
	async removeReader(newReader, eim) {
		if (this.agent != null) {
			await this.agent.removeReader(newReader, eim);
		}
		if (this.assertionDate != null) {
			await this.assertionDate.removeReader(newReader, eim);
		}
		if (this.decayFunction != null) {
			await this.decayFunction.removeReader(newReader, eim);
		}
		if (this.evidence != null)
			for (let i = 0; i < this.evidence.length; i++) {
				await this.evidence[i].removeReader(newReader, eim);
			}
		if (this.expirationDate != null) {
			await this.expirationDate.removeReader(newReader, eim);
		}
		if (this.negative != null) {
			await this.negative.removeReader(newReader, eim);
		}
		if (this.subject != null) {
			await this.subject.removeReader(newReader, eim);
		}
		await super.removeReader(newReader);
	}
	addReaderAsync(newReader, success, failure, eim) {
		return cassPromisify(addReader(newReader, eim), success, failure);
	}
	removeReaderAsync(oldReader, success, failure, eim) {
		return cassPromisify(removeReader(newReader, eim), success, failure);
	}
	getSearchStringByTypeAndCompetency(competency) {
		return (
			"(" +
			this.getSearchStringByType() +
			' AND competency:"' +
			competency.shortId() +
			'")'
		);
	}
};
