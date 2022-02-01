const EcArray = require("../../com/eduworks/ec/array/EcArray");
const EcRepository = require("../cassproject/ebac/repository/EcRepository");

module.exports = class EcOrganization extends schema.Organization {
	static ORG_PPK_SET_KEY = "https://schema.cassproject.org/0.3/ppkSet";
	/**
	 *  Retrieves an organization from it's server asynchronously
	 *
	 *  @param {String}            id
	 *                             ID of the concept to retrieve from the server
	 *  @param {Callback1<String>} success
	 *                             Callback triggered after retrieving the organization,
	 *                             returns the organization retrieved
	 *  @param {Callback1<String>} failure
	 *                             Callback triggered if error retrieving organization
	 *  @memberOf EcOrganization
	 *  @method get
	 *  @static
	 */
	static get(id, success, failure, repo, eim) {
		return EcRepository.getAs(id, new EcOrganization(), success, failure, repo, eim);
	}
	/**
	 *  Retrieves an organization from it's server synchronously, the call
	 *  blocks until it is successful or an error occurs
	 *
	 *  @param {String} id
	 *                  ID of the organization to retrieve
	 *  @return EcOrganization
	 *  The concept retrieved
	 *  @memberOf EcOrganization
	 *  @method getBlocking
	 *  @static
	 */
	static getBlocking(id, repo, eim) {
		return EcRepository.getAs(id, new EcOrganization(), null, null, repo, eim);
	}
	/**
	 *  Searches a repository for organizations that match the search query
	 *
	 *  @param {EcRepository}                    repo Repository to search using the query
	 *  @param {String}                          query Query string to pass to the search web service
	 *  @param {Callback1<Array<EcOrganization>> success Callback triggered after
	 *                                           completing the search, returns the results
	 *  @param {Callback1<String>}               failure Callback triggered if error searching
	 *  @param {Object}                          paramObj Parameter object for search
	 *  @memberOf EcOrganization
	 *  @method search
	 *  @static
	 */
	static search(repo, query, success, failure, paramObj, eim) {
		return EcRepository.searchAs(
			repo,
			query,
			() => new EcOrganization(),
			success,
			failure,
			paramObj, eim
		);
	}
	/**
	 *  Adds the given person's id to the employee list
	 *
	 *  @param {EcPerson}          person Person to add to the Organization's employee list
	 *  @method addEmployee
	 */
	addEmployee(person) {
		if (this.employee == null) this["employee"] = [];
		if (!EcArray.isArray(this.employee))
			throw new Error("Employee is not Array");
		var ary = this.employee;
		var psid = person.shortId();
		for (var i = 0; i < ary.length; i++) {
			if (ary[i] == psid) return;
		}
		ary.push(psid);
	}
	/**
	 *  Removes the person id from the employee list
	 *
	 *  @param {String}          id Person id to be removed from Organization's employee list
	 *  @method removeEmployeeById
	 */
	removeEmployeeById(id) {
		if (this.employee == null) return;
		if (!EcArray.isArray(this.employee))
			throw new Error("Employee is not Array");
		var ary = this.employee;
		for (var i = 0; i < ary.length; i++) {
			if (
				EcRemoteLinkedData.trimVersionFromUrl(ary[i]) ==
				EcRemoteLinkedData.trimVersionFromUrl(id)
			) {
				ary.splice(i, 1);
			}
		}
	}
	/**
	 *  Moves all Person type Member to Employee
	 *
	 *  @method movePersonMembersToEmployee
	 */
	movePersonMembersToEmployee() {
		if (this.member == null) return;
		if (this.employee == null) this["employee"] = [];
		if (!EcArray.isArray(this.employee) || !EcArray.isArray(this.member))
			return;
		var membAry = this.member;
		var empAry = this.employee;
		for (var i = 0; i < membAry.length; i++) {
			var id = membAry[i];
			if (id.toLowerCase().indexOf("person") > -1) {
				if (empAry.indexOf(id) <= -1) {
					empAry.push(id);
				}
				membAry.splice(i, 1);
			}
		}
	}
	/**
	 *  Adds the given person's id to the employee list
	 *
	 *  @param {Array<EcPpk>} ppkList Person to add to the Organization's employee list
	 *
	 *  @return String
	 *  A JSON array string containing the PEMs of the given PPKs
	 *
	 *  @method ppkListToPemArrayString
	 */
	ppkListToPemArrayString(ppkList) {
		if (ppkList == null) return JSON.stringify([]);
		else {
			var pemArray = [];
			for (var i = 0; i < ppkList.length; i++) {
				pemArray.push(ppkList[i].toPem());
			}
			return JSON.stringify(pemArray);
		}
	}
	/**
	 *  Add's a key to the organization
	 *
	 *  @param {EcPpk}   newOrgPpk The key to add to the organization
	 *  @memberOf EcOrganization
	 *  @method addOrgKey
	 */
	async addOrgKey(newOrgPpk) {
		var orgKeys = await this.getOrgKeys();
		orgKeys.push(newOrgPpk);
		this[EcOrganization.ORG_PPK_SET_KEY] = orgKeys;
	}
	/**
	 *  Performs a rekey operation and saves the organization details to the server
	 *
	 *  @param {Callback1<String>} success
	 *                             Callback triggered on successfully saving the competency
	 *  @param {Callback1<String>} failure
	 *                             Callback triggered if error saving competency
	 *  @memberOf EcOrganization
	 *  @method rekeyAndSave
	 */
	async rekeyAndSave(success, failure, repo, eim) {
		if (eim === undefined || eim == null)
			eim = EcIdentityManager.default;
		if (repo == null) {
			var msg = "Repository cannot be null for a rekey operation";
			if (failure != null) failure(msg);
			else console.error(msg);
			return;
		} else {
			var oldKey = await this.getCurrentOrgKey();
			var newKey = EcPpk.generateKey();
			var identity = new EcIdentity();
			identity.ppk = newKey;
			identity.displayName = "Organization Rekey New Key";
			eim.addIdentity(identity);
			var rekeyRequest = await EcRekeyRequest.generateRekeyRequest(
				repo.selectedServer,
				oldKey,
				newKey
			);
			this.addOrgKey(newKey);
			var newKeys = await EcEncryptedValue.encryptValue(
				this.ppkListToPemArrayString(await this.getOrgKeys()),
				EcOrganization.ORG_PPK_SET_KEY,
				this.owner,
				this.reader
			);
			this[EcOrganization.ORG_PPK_SET_KEY] = newKeys;
			await repo.saveTo(
				this,
				async () => {
					await repo.saveTo(rekeyRequest, success, failure, eim);
				},
				failure, eim
			);
		}
	}
	/**
	 *  Encrypts the org keys and saves the organization details to the server
	 *
	 *  @param {Callback1<String>} success
	 *                             Callback triggered on successfully saving the competency
	 *  @param {Callback1<String>} failure
	 *                             Callback triggered if error saving competency
	 *  @memberOf EcOrganization
	 *  @method save
	 */
	async save(success, failure, repo, eim) {
		var newKeys = await EcEncryptedValue.encryptValue(
			this.ppkListToPemArrayString(await this.getOrgKeys()),
			EcOrganization.ORG_PPK_SET_KEY,
			this.owner,
			this.reader
		);
		this[EcOrganization.ORG_PPK_SET_KEY] = newKeys;
		if (repo == null) return EcRepository.save(this, success, failure, repo, eim);
		else return repo.saveTo(this, success, failure, eim);
	}
	/**
	 *  Returns the current organization key
	 *
	 *  @return EcPpk
	 *  The current organization key
	 *  @memberOf EcOrganization
	 *  @method getCurrentOrgKey
	 */
	async getCurrentOrgKey() {
		var orgKeys = await this.getOrgKeys();
		if (orgKeys.length >= 1) {
			return orgKeys[orgKeys.length - 1];
		} else return null;
	}
	/**
	 *  Returns the list of organization keys
	 *
	 *  @return Array<EcPpk>
	 *  The Array of organization keys
	 *  @memberOf EcOrganization
	 *  @method getOrgKeys
	 */
	async getOrgKeys(eim) {
		var orgKeys = [];
		var o = this[EcOrganization.ORG_PPK_SET_KEY];
		if (o != null && (o.type === 'EncryptedValue' || o["@type"] === 'EncryptedValue')) {
			var ev = new EcEncryptedValue();
			ev.copyFrom(o);
			var orgKeysPPKPems = JSON.parse(await ev.decryptIntoString(null, null, eim));
			for (var i = 0; i < orgKeysPPKPems.length; i++) {
				orgKeys.push(EcPpk.fromPem(orgKeysPPKPems[i]));
			}
		} else if (o) {
			orgKeys = o;
		}
		return orgKeys;
	}
	/**
	 *  Moves old key field to new key field array
	 *
	 *  @method moveKeyField
	 */
	async moveKeyField(eim) {
		var o = this["https://schema.cassproject.org/0.3/ppk"];
		if (o != null) {
			var ev = new EcEncryptedValue();
			ev.copyFrom(o);
			var currentGroupPpkPem = await ev.decryptIntoString(null, null, eim);
			var keyArray = [];
			keyArray.push(currentGroupPpkPem);
			var newKey = await EcEncryptedValue.encryptValue(
				JSON.stringify(keyArray),
				EcOrganization.ORG_PPK_SET_KEY,
				this.owner,
				this.reader
			);
			this[EcOrganization.ORG_PPK_SET_KEY] = newKey;
			delete this["https://schema.cassproject.org/0.3/ppk"];
		}
	}
	upgrade(eim) {
		super.upgrade();
		this.movePersonMembersToEmployee();
		this.moveKeyField(eim);
	}
	/**
	 *  Attempts to find and return the organization's fingerprint from the id.
	 *
	 *  @return {String}
	 *  @method getFingerprintFromId
	 */
	getFingerprintFromId() {
		return this.getGuid();
	}
	/**
	 *  Attempts to find and return the organization's fingerprint from the id.
	 *
	 *  @return {String}
	 *  @method getFingerprintFromId
	 */
	getFingerprint() {
		return this.getGuid();
	}
};
