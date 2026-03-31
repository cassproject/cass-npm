
let forge = require("node-forge");
let EcPk = require("./EcPk.js");
require("../../../../org/cassproject/general/AuditLogger.js");
/**
 *  Helper classes for dealing with RSA Private Keys.
 *
 *  @author fritz.ray@eduworks.com
 *  @class EcPpk
 *  @module com.eduworks.ec
 */
module.exports = class EcPpk {
	static cache = {};
	defaultPem = null;
	jwk = null;
	key = null;
	signKey = null;
	ppk = null;
	defaultPk = null;
	/**
	 *  Decodes a PEM encoded PrivateKeyInfo (PKCS#8) or RSAPrivateKey (PKCS#1) formatted RSA Public Key.
	 *  (In case you were curious.)
	 *
	 *  @param {string} pem PEM as a string.
	 *  @return {EcPk} Object used to perform public key operations.
	 *  @method fromPem
	 *  @static
	 */
	static fromPem(pem) {
		let pk = EcPpk.cache[pem];
		if (pk != null)
			return pk;
		pk = new EcPpk();
		try {
			pk.ppk = forge.pki.privateKeyFromPem(pem);
		} catch (ex) {
			global.auditLogger.report(global.auditLogger.LogCategory.SYSTEM, global.auditLogger.Severity.ERROR, "EcPpkFromPem", ex);
			return null;
		}
		EcPpk.cache[pem] = pk;
		return pk;
	}
	/**
	 *  Generates an RSA Keypair using web workers.
	 *
	 *  @param {function(EcPpk)} callback Method called when the keypair is generated.
	 *  @method generateKeyAsync
	 *  @static
	 */
	static generateKeyAsync(callback) {
		return new Promise((resolve, reject) => {
			forge.pki.rsa.generateKeyPair({ workers: -1 }, function (err, keypair) {
				let ppk = new EcPpk();
				ppk.ppk = keypair.privateKey;
				if (callback != null)
					callback(ppk);
				resolve(ppk);
			});
		})
	}
	/**
	 *  Generates an RSA Keypair synchronously. Can take a while.
	 *
	 *  @return {EcPpk} Public private keypair.
	 *  @method generateKey
	 *  @static
	 */
	static generateKey() {
		let keypair = forge.pki.rsa.generateKeyPair({ workers: -1 }, null);
		let ppk = new EcPpk();
		ppk.ppk = keypair.privateKey;
		return ppk;
	}
	/**
	 *  Returns true iff the PEM forms of the public private keypair match.
	 *  Can also match against a public key if the public portion of the keypair match.
	 *
	 *  @param {EcPpk|EcPk} Key to compare to.
	 *  @return boolean If they match.
	 *  @method equals
	 */
	equals(obj) {
		if (obj instanceof EcPpk)
			return this.toPem() == obj.toPem();
		if (obj instanceof EcPk)
			return this.toPk().toPem() == obj.toPem();
		return Object.equals.call(this, obj);
	}
	/**
	 *  Encodes the private key into a PEM encoded RSAPrivateKey (PKCS#1) formatted RSA Public Key.
	 *  (In case you were curious.)
	 *
	 *  @return {string} PEM encoded public key without whitespace.
	 *  @method toPem
	 */
	toPem() {
		if (this.defaultPem == null)
			this.defaultPem = forge.pki
				.privateKeyToPem(this.ppk)
				.replace(/\r/g, "")
				.replace(/\n/g, "");
		return this.defaultPem;
	}
	/**
	 *  Encodes the private key into a PEM encoded RSAPrivateKey (PKCS#1) formatted RSA Public Key.
	 *  (In case you were curious.)
	 *
	 *  @return {string} PEM encoded public key without whitespace.
	 *  @method toPkcs1Pem
	 */
	toPkcs1Pem = function () {
		return forge.pki
			.privateKeyToPem(this.ppk)
			.replace(/\r/g, "")
			.replace(/\n/g, "");
	};
	/**
	 *  Encodes the private key into a PEM encoded PrivateKeyInfo (PKCS#8) formatted RSA Public Key.
	 *  (In case you were curious.)
	 *
	 *  @return {string} PEM encoded public key without whitespace.
	 *  @method toPkcs8Pem
	 */
	toPkcs8Pem = function () {
		return forge.pki
			.privateKeyInfoToPem(
				forge.pki.wrapRsaPrivateKey(
					forge.pki.privateKeyToAsn1(this.ppk)
				)
			)
			.replace(/\r/g, "")
			.replace(/\n/g, "");
	};
	toJwk() {
		if (this.jwk == null) {
			const bnToBase64Url = (bn) => {
				let hex = bn.toString(16);
				if (hex.length % 2 !== 0) {
					hex = '0' + hex;
				}
				const bytes = forge.util.hexToBytes(hex);
				const b64 = forge.util.encode64(bytes);
				return b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
			};
			this.jwk = {
				kty: "RSA",
				n: bnToBase64Url(this.ppk.n),
				e: bnToBase64Url(this.ppk.e),
				d: bnToBase64Url(this.ppk.d),
				p: bnToBase64Url(this.ppk.p),
				q: bnToBase64Url(this.ppk.q),
				dp: bnToBase64Url(this.ppk.dP),
				dq: bnToBase64Url(this.ppk.dQ),
				qi: bnToBase64Url(this.ppk.qInv)
			};
		}
		return this.jwk;
	}
	toPkcs8 = function () {
		return forge.pki.wrapRsaPrivateKey(
			forge.pki.privateKeyToAsn1(this.ppk)
		);
	};
	/**
	 *  Extracts the public key portion from the public private keypair.
	 *
	 *  @return {EcPk} Public Key Helper.
	 *  @method toPk
	 */
	toPk() {
		if (this.defaultPk != null) return this.defaultPk;
		let pk = this.defaultPk = new EcPk();
		pk.pk = forge.pki.rsa.setPublicKey(this.ppk.n, this.ppk.e);
		return pk;
	}
	/**
	 *  Returns true if this PPK is in an array of PPKs.
	 *
	 *  @param {Array<EcPpk>} ppks Array of ppks
	 *  @return true iff this PPK in ppks.
	 *  @method inArray
	 */
	inArray(ppks) {
		for (let ppk of ppks) {
			if (ppk.equals(this)) {
				return true;
			}
		}
		return false;
	}
};
