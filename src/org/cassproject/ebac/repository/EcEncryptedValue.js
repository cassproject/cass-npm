const Ebac = require("../../../../org/cassproject/schema/general/Ebac");
const EcArray = require("../../../../com/eduworks/ec/array/EcArray");
const EcObject = require("../../../../com/eduworks/ec/array/EcObject");
const EcAes = require("../../../../com/eduworks/ec/crypto/EcAes");
const EcAesCtrAsync = require("../../../../com/eduworks/ec/crypto/EcAesCtrAsync");
const EcPk = require("../../../../com/eduworks/ec/crypto/EcPk");
const EcRsaOaepAsync = require("../../../../com/eduworks/ec/crypto/EcRsaOaepAsync");
const {cassPromisify, cassReturnAsPromise} = require("../../../../com/eduworks/ec/promises/helpers");
const EbacEncryptedSecret = require("../../../../com/eduworks/schema/ebac/EbacEncryptedSecret");
const EbacEncryptedValue = require("../../../../com/eduworks/schema/ebac/EbacEncryptedValue");
const EcLinkedData = require("../../../json/ld/EcLinkedData");
const EcIdentityManager = require("../identity/EcIdentityManager");
const base64 = require("base64-arraybuffer");
const EcRemoteLinkedData = require("../../schema/general/EcRemoteLinkedData");

/**
 *  Represents an encrypted piece of data. Provides helper functions for
 *  encryption/decryption of JSON-LD objects, and provides some searchability of
 *  the data within.
 *
 *  @author fritz.ray@eduworks.com
 *  @module com.eduworks.ec
 *  @class EcEncryptedValue
 *  @extends EbacEncryptedValue
 */
module.exports = class EcEncryptedValue extends EbacEncryptedValue {
	static encryptOnSaveMap = null;
	static revive(partiallyRehydratedObject) {
		if (partiallyRehydratedObject == null) return null;
		var v = new EcEncryptedValue();
		v.copyFrom(partiallyRehydratedObject);
		return v;
	}
	/**
	 *  Converts a piece of (likely) encrypted remote linked data to an unencrypted object.
	 *  @param d Data to decrypt
	 *  @return Decrypted data
	 *  @memberOf EcEncryptedValue
	 *  @static
	 *  @method fromEncryptedValue
	 */
	static fromEncryptedValue(d, success, failure, eim) {
	if (!d.isAny(new EcEncryptedValue().getTypes())) {
		return cassReturnAsPromise(d, success, failure);
	} else {
			var eev = new EcEncryptedValue();
			eev.copyFrom(d);
			EcEncryptedValue.encryptOnSave(d.id, true);
			EcEncryptedValue.encryptOnSave(d.shortId(), true);
			return eev.decryptIntoObject(success, failure, eim);
		}
	}
	/**
	 *  Converts a piece of (likely) encrypted remote linked data to an unencrypted object.
	 *  @param {EcRemoteLinkedData} d Data to decrypt
	 *  @param {Callback1<EcRemoteLinkedData>} success
	 *  @param {Callback1<String>} failure
	 *  @param d Data to decrypt
	 *  @return Decrypted data
	 *  @memberOf EcEncryptedValue
	 *  @static
	 *  @method fromEncryptedValue
	 *  @deprecated
	 */
	static fromEncryptedValueAsync(d, success, failure, eim) {
		console.trace(
			"fromEncryptedValueAsync is deprecated. The promise version, fromEncryptedValue, supports promises and callbacks. This will continue to function."
		);
		return this.fromEncryptedValue(d, success, failure, eim);
	}
	/**
	 *  Gets the fully qualified type name, as JSON-LD allows the "namespace" of
	 *  the type to be defined in @context.
	 *
	 *  @return {string} Fully qualified type name.
	 *  @method getEncryptedFullType
	 */
	getEncryptedFullType() {
		if (this.encryptedContext == null) return this.encryptedType;
		if (this.encryptedType.indexOf("http") != -1) return this.encryptedType;
		var computedType = this.encryptedContext;
		if (EcObject.isObject(this.encryptedContext)) {
			var typeParts = this.encryptedType.split(":");
			if (typeParts.length == 2) {
				computedType = this.encryptedContext[typeParts[0]];
				if (!computedType.endsWith("/")) computedType += "/";
				computedType += typeParts[1];
				return computedType;
			} else if (this.encryptedContext["@vocab"] != null)
				computedType = this.encryptedContext["@vocab"];
		}
		if (!computedType.endsWith("/")) computedType += "/";
		computedType += this.encryptedType;
		return computedType;
	}
	getEncryptedDottedType() {
		return this.getEncryptedFullType()
			.replace("http://", "")
			.replace("https://", "")
			.replace(/\//g, ".");
	}
	/**
	 *  Converts a piece of remote linked data to an encrypted value
	 *
	 *  @param {EcRemoteLinkedData} d Data to encrypt
	 *  @param {Boolean}            hideType Flag to hide the type of the encrypted value
	 *                              when encrypting
	 *  @return {EcEncryptedValue} Encrypted value
	 *  @memberOf EcEncryptedValue
	 *  @method toEncryptedValue
	 *  @static
	 */
	static toEncryptedValue(d, hideType, success, failure) {
		d.updateTimestamp();
		let v = new EcEncryptedValue();
		if (hideType == null || !hideType) {
			v.encryptedType = d.type;
		}
		if (d["name"] != null) {
			v.name = d["name"];
		}
		var newIv = EcAes.newIv(16);
		var newSecret = EcAes.newIv(16);
		return this.encryptValueActual(
			v,
			d.toJson(),
			newIv,
			newSecret,
			d.id,
			d.owner,
			d.reader,
			success,
			failure
		);
	}
	/**
	 *  Converts a piece of remote linked data to an encrypted value,
	 *  asynchronously
	 *
	 *  @param {EcRemoteLinkedData}          d Data to encrypt
	 *  @param {boolean}                     hideType Flag to hide the type of the encrypted value
	 *                                       when encrypting
	 *  @param {Callback1<EcEncryptedValue>} success Callback triggered with
	 *                                       successfully encrypted, returns the encrypted value
	 *  @param {Callback1<String>}           failure Callback triggered on error during
	 *                                       encryption
	 *  @memberOf EcEncryptedValue
	 *  @method toEncryptedValueAsync
	 *  @static
	 */
	static toEncryptedValueAsync(d, hideType, success, failure) {
		console.trace(
			"toEncryptedValueAsync is deprecated. The promise version, toEncryptedValue, supports promises and callbacks. This will continue to function."
		);
		return this.toEncryptedValue(d, hideType, success, failure);
	}

	/**
	 *  Encrypts a text value with the key provided
	 *
	 *  @param {String} text Text to encrypt
	 *  @param {String} id ID of the encrypted value
	 *  @param {EcPk}   owner Key to Encrypt
	 *  @return {EcEncryptedValue} Encrypted value
	 *  @memberOf EcEncryptedValue
	 *  @method encryptValueOld
	 *  @static
	 *  @deprecated
	 */
	static encryptValueOld(text, id, owner) {
		var newIv = EcAes.newIv(16);
		var newSecret = EcAes.newIv(16);
		return this.encryptValueActual(
			new EcEncryptedValue(),
			text,
			newIv,
			newSecret,
			id,
			[owner],
			null,
			null,
			null
		);
	}
	/**
	 *  Encrypts a text value with the owners and readers provided
	 *
	 *  @param {String}   text Text to encrypt
	 *  @param {String}   id ID of the value to encrypt
	 *  @param {String[]} owners Owner keys to encrypt value with
	 *  @param {String[]} readers Reader keys to encrypt value with
	 *  @return {EcEncryptedValue} Encrypted value
	 *  @memberOf EcEncryptedValue
	 *  @method encryptValue
	 *  @static
	 */
	static encryptValue(text, id, owners, readers) {
		var v = new EcEncryptedValue();
		var newIv = EcAes.newIv(16);
		var newSecret = EcAes.newIv(16);
		return this.encryptValueActual(
			v,
			text,
			newIv,
			newSecret,
			id,
			owners,
			readers,
			null,
			null
		);
	}
	/**
	 *  Encrypts a text value with the owners and readers provided
	 *
	 *  @param {String}   text Text to encrypt
	 *  @param {String}   id ID of the value to encrypt
	 *  @param {String[]} owners Owner keys to encrypt value with
	 *  @param {String[]} readers Reader keys to encrypt value with
	 *  @return {EcEncryptedValue} Encrypted value
	 *  @memberOf EcEncryptedValue
	 *  @method encryptValue
	 *  @static
	 */
	static encryptValueAsync(text, id, owners, readers, success, failure) {
		var v = new EcEncryptedValue();
		var newIv = EcAes.newIv(16);
		var newSecret = EcAes.newIv(16);
		return this.encryptValueActual(
			v,
			text,
			newIv,
			newSecret,
			id,
			owners,
			readers,
			success,
			failure
		);
	}

	static encryptValueActual(
		v,
		text,
		iv,
		secret,
		id,
		owners,
		readers,
		success,
		failure
	) {
		return cassPromisify(
			EcAesCtrAsync.encrypt(text, secret, iv).then((encryptedText) => {
				v.payload = encryptedText;
				v.owner = owners;
				v.reader = readers;
				v.id = id;
				let promises = [];
				let insertSecret = (pk, newIv, newSecret) => {
					var eSecret = new EbacEncryptedSecret();
					eSecret.iv = newIv;
					eSecret.secret = newSecret;
					return EcRsaOaepAsync.encrypt(
						EcPk.fromPem(pk),
						eSecret.toEncryptableJson()
					);
				};
				if (owners != null)
					promises = promises.concat(
						owners.map((pk) => insertSecret(pk, iv, secret))
					);
				if (readers != null)
					promises = promises.concat(
						readers.map((pk) => insertSecret(pk, iv, secret))
					);
				let p = Promise.all(promises).then((secrets) => {
					v.secret = secrets;
					return v;
				});
				return p;
			}),
			success,
			failure
		);
	}
	/**
	 *  Encrypt a value with a specific IV and secret
	 *
	 *  @param {String}   iv Initialization Vector for encryption
	 *  @param {String}   secret Encryption secret
	 *  @param {String}   text Text to encrypt
	 *  @param {String}   id ID of value to encrypt
	 *  @param {String[]} owners Owners keys to encrypt with
	 *  @param {String[]} readers Reader Keys to encrypt with
	 *  @return {EcEncryptedValue}
	 *  @memberOf EcEncryptedValue
	 *  @method encryptValueUsingIvAndSecret
	 *  @static
	 */
	static encryptValueUsingIvAndSecret(iv, secret, text, id, owners, readers) {
		return this.encryptValueActual(
			v,
			text,
			iv,
			secret,
			id,
			owners,
			readers,
			null,
			null
		);
	}
	/**
	 *  Setter and getter function for encryptOnSave of an identifier,
	 *  encryptOnSave is used by the static save functions of a class to
	 *  determine whether or not to encrypt something when it is saved. This
	 *  value is usually set when an object is decrypted using one of the decrypt
	 *  functions above.
	 *
	 *  @param {String}  id ID of the data to get/set encryptOnSave for
	 *  @param {boolean} [val] If passed in, sets the value, if null this
	 *                   function gets the encryptOnSave value
	 *  @return {boolean} if val is null/ignored returns value in the map, if val
	 *  is passed in returns val
	 *  @memberOf EcEncryptedValue
	 *  @method encryptOnSave
	 *  @static
	 */
	static encryptOnSave(id, val) {
		if (EcEncryptedValue.encryptOnSaveMap == null) {
			EcEncryptedValue.encryptOnSaveMap = {};
		}
		if (val == null) {
			if (EcEncryptedValue.encryptOnSaveMap[id] != null) {
				return EcEncryptedValue.encryptOnSaveMap[id];
			} else {
				return false;
			}
		} else {
			EcEncryptedValue.encryptOnSaveMap[id] = val;
			return val;
		}
	}
	/**
	 *  Decrypts this encrypted value into an object
	 *
	 *  @return The Decrypted Object
	 *  @memberOf EcEncryptedValue
	 *  @method decryptIntoObject
	 */
	decryptIntoObject(success, failure, eim) {
		return cassPromisify(
			this.decryptIntoString(null, null, eim).then((decryptRaw) => {
				if (decryptRaw == null) {
					return null;
				}
				if (!EcLinkedData.isProbablyJson(decryptRaw)) {
					return null;
				}
				var decrypted = new EcRemoteLinkedData("", "");
				decrypted.copyFrom(JSON.parse(decryptRaw));
				EcEncryptedValue.encryptOnSave(decrypted.id, true);
				decrypted.id = this.id;
				return decrypted.deAtify();
			}),
			success,
			failure
		);
	}
	/**
	 *  Asynchronously decrypts an encrypted value into a string
	 *
	 *  @param {Callback1<String>} success Callback triggered after successfully
	 *                             decrypted, returns decrypted string
	 *  @param {Callback1<String>} failure Callback triggered if error during
	 *                             decryption
	 *  @memberOf EcEncryptedValue
	 *  @method decryptIntoString
	 */
	decryptIntoString(success, failure, eim) {
		return cassPromisify(
			this.decryptSecret(eim).then((decryptSecret) => {
				if (decryptSecret != null) {
					if (
						this.context == Ebac.context_0_2 ||
						this.context == Ebac.context_0_3
					) {
						if (base64.decode(decryptSecret.iv).byteLength == 32)
							decryptSecret.iv = base64.encode(
								base64.decode(decryptSecret.iv).slice(0, 16)
							);
					}
					return EcAesCtrAsync.decrypt(
						this.payload,
						decryptSecret.secret,
						decryptSecret.iv
					);
				}
				throw new Error("Could not decrypt secret.");
			}),
			success,
			failure
		);
	}
	/**
	 *  Attempts to decrypt secret using all identities in
	 *  Identity Manager
	 *
	 *  @memberOf EcEncryptedValue
	 *  @method decryptSecret
	 */
	decryptSecret(eim) {
		if (this.decryptedSecret != null) {
			let eec = new EbacEncryptedSecret();
			eec.copyFrom(this.decryptedSecret);
			return cassReturnAsPromise(eec, null, null, null);
		}
		if (eim === undefined || eim == null)
			eim = EcIdentityManager.default;
		var ppks = [];
		var estimatedIndices = [];
		if (this.owner != null) {
			for (var i = 0; i < this.owner.length; i++) {
				var decryptionKey = eim.getPpk(
					EcPk.fromPem(this.owner[i])
				);
				if (decryptionKey != null) {
					if (!decryptionKey.inArray(ppks)) {
						ppks.push(decryptionKey);
						estimatedIndices.push(i);
					}
				}
			}
		}
		if (this.reader != null) {
			for (var i = 0; i < this.reader.length; i++) {
				var decryptionKey = eim.getPpk(
					EcPk.fromPem(this.reader[i])
				);
				if (decryptionKey != null) {
					if (!decryptionKey.inArray(ppks)) {
						ppks.push(decryptionKey);
						estimatedIndices.push(i + this.owner.length);
					}
				}
			}
		}
		let iterate = (resolve, reject) => {
			if (ppks.length == 0 && estimatedIndices.length == 0)
				reject(new Error("Could not decrypt secret.")); // TODO: Try all identified ppks against all secrets.
			let ppk = ppks.pop();
			let estimatedIndex = estimatedIndices.pop();
			let encryptedSecret = this.secret[estimatedIndex];
			let p = EcRsaOaepAsync.decrypt(ppk, encryptedSecret).then(
				(decryptedSecret) => {
					if (
						decryptedSecret != null &&
						EcLinkedData.isProbablyJson(decryptedSecret)
					) {
						return EbacEncryptedSecret.fromEncryptableJson(
							JSON.parse(decryptedSecret)
						);
					}
					console.log(JSON.stringify(decryptedSecret, null, 2));
					return new Promise(iterate);
				}
			);
			resolve(p);
		};
		return new Promise(iterate);
	}
	/**
	 *  Checks if this encrypted value is an encrypted version of a specific
	 *  type, only works if the type wasn't hidden during encryption
	 *
	 *  @param {String} type Type to compare if an encrypted type
	 *  @return {boolean} True if encrypted version of type, false if not or
	 *  can't tell
	 *  @memberOf EcEncryptedValue
	 *  @method isAnEncrypted
	 */
	isAnEncrypted(type) {
		if (this.encryptedType == null) {
			return false;
		}
		var typeSplit = type.split("/");
		return (
			this.encryptedType == type ||
			this.encryptedType == typeSplit[typeSplit.length - 1]
		);
	}
	/**
	 *  Adds a reader to the object, if the reader does not exist.
	 *
	 *  @param {EcPk} newReader PK of the new reader.
	 *  @memberOf EcEncryptedValue
	 *  @method addReader
	 */
	addReader(newReader, eim) {
		super.addReader(newReader);
		return this.decryptSecret(eim).then((decryptedSecret) => {
			if (decryptedSecret == null) {
				throw "Cannot add a Reader if you don't know the secret";
			}
			return EcRsaOaepAsync.encrypt(
				newReader,
				decryptedSecret.toEncryptableJson()
			).then((encryptedSecret) =>
				EcArray.setAdd(this.secret, encryptedSecret)
			);
		});
	}
	/**
	 *  Removes a reader from the object, if the reader does exist.
	 *
	 *  @param {EcPk} oldReader PK of the old reader.
	 *  @memberOf EcEncryptedValue
	 *  @method removeReader
	 */
	removeReader(oldReader, eim) {
		return this.decryptSecret(eim).then((decryptedSecret) => {
			if (this.reader != null) {
				EcArray.setRemove(this.reader, oldReader.toPem());
			}
			this.secret = [];
			let promises = [];
			if (this.owner != null)
				promises = promises.concat(
					this.owner.map((pk) =>
						EcRsaOaepAsync.encrypt(
							EcPk.fromPem(pk),
							decryptedSecret.toEncryptableJson()
						)
					)
				);
			if (this.reader != null)
				promises = promises.concat(
					this.reader.map((pk) =>
						EcRsaOaepAsync.encrypt(
							EcPk.fromPem(pk),
							decryptedSecret.toEncryptableJson()
						)
					)
				);
			let p = Promise.all(promises).then((secrets) => {
				this.secret = secrets;
			});
			return p;
		});
	}
};
