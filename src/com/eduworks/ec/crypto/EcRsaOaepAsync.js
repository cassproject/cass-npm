let base64 = require("base64-arraybuffer");
let forge = require("node-forge");
const EcAesCtrAsync = require("./EcAesCtrAsync.js");
require("../../../../org/cassproject/general/AuditLogger.js");
if (typeof crypto == 'undefined')
{
	if (typeof window !== 'undefined' && window != null && window !== undefined)
		if (window.crypto != null)
			crypto = window.crypto;
	try {
		let requireResult = require('crypto').webcrypto;
		if (requireResult != null)
			crypto = requireResult;
	} catch (err) {
		global.auditLogger.report(global.auditLogger.LogCategory.SYSTEM, global.auditLogger.Severity.INFO, "EcRsaOaepAsync", "Webcrypto not available. Tests will fail. Please upgrade, if possible, to Node 16. Non-test mode will fallback to slower cryptograpy methods.: " + err);
	}
}

let EcCrypto = require("./EcCrypto.js");
let EcRsaOaep = require("./EcRsaOaep.js");
let cassPromisify = require("../promises/helpers.js").cassPromisify;
let cassReturnAsPromise = require("../promises/helpers.js").cassReturnAsPromise;
/**
 *  Async version of EcRsaOaep that uses browser extensions (window.crypto) to accomplish cryptography much faster.
 *  Falls back to EcRsaOaepAsyncWorker, if window.crypto is not available.
 *  @class EcRsaOaepAsync
 */
module.exports = class EcRsaOaepAsync {
	/**
	 *  Asynchronous form of {{#crossLink
	 *  "EcRsaOaep/encrypt:method"}}EcRsaOaep.encrypt{{/crossLink}}
	 *
	 *  @param {EcPk}             pk Public Key to use to encrypt.
	 *  @param {string}           plaintext Plaintext to encrypt.
	 *  @param {function(string)} success Success method, result is Base64
	 *                            encoded Ciphertext.
	 *  @param {function(string)} failure Failure method, parameter is error
	 *                            message.
	 *  @method encrypt
	 *  @static
	 */
	static encrypt(pk, plainText, success, failure) {
		if (EcCrypto.testMode)
			console.log("encrypt: " + plainText)
		if (crypto?.subtle == null) {
			return EcRsaOaep.encrypt(pk, plainText, success, failure); //NOSONAR -- This is a Fallback method.
		}
		EcAesCtrAsync.fipsOn();
		let keyUsages = ["encrypt"];
		let algorithm = {};
		algorithm.name = "RSA-OAEP";
		algorithm.hash = "SHA-1";
		let p = null;
		if (pk.key == null) {
			p = crypto.subtle
				.importKey("jwk", pk.toJwk(), algorithm, false, keyUsages)
				.then(function (key) {
					pk.key = key;
					EcAesCtrAsync.fipsOn();
					return crypto.subtle.encrypt(
						algorithm,
						key,
						EcCrypto.str2ab(forge.util.encodeUtf8(plainText))
					);
				});
		} else {
			p = crypto.subtle.encrypt(
				algorithm,
				pk.key,
				EcCrypto.str2ab(forge.util.encodeUtf8(plainText))
			);
		}
		p = p.then((result) => {
			EcAesCtrAsync.fipsOff();
			return base64.encode(result);
		});
		return cassPromisify(p, success, failure);
	}
	/**
	 *  Asynchronous form of {{#crossLink
	 *  "EcRsaOaep/decrypt:method"}}EcRsaOaep.decrypt{{/crossLink}}
	 *
	 *  @param {EcPpk}            ppk Public private keypair to use to decrypt.
	 *  @param {string}           ciphertext Ciphertext to decrypt.
	 *  @param {function(string)} success Success method, result is unencoded
	 *                            plaintext.
	 *  @param {function(string)} failure Failure method, parameter is error
	 *                            message.
	 *  @method decrypt
	 *  @static
	 */
	static decrypt(ppk, cipherText, success, failure) {
		if (EcCrypto.testMode)
			console.log("decrypt: " + cipherText)
		if (EcCrypto.caching) {
			let cacheGet = null;
			cacheGet = EcCrypto.decryptionCache[ppk.toPk().fingerprint() + cipherText];
			if (cacheGet != null) {
				return cassReturnAsPromise(cacheGet, success, failure);
			}
		}
		if (crypto?.subtle == null) {
			return EcRsaOaep.decrypt(ppk, cipherText, success, failure);  //NOSONAR -- This is a Fallback method.
		}
		EcAesCtrAsync.fipsOn();
		let algorithm = {};
		algorithm.name = "RSA-OAEP";
		algorithm.hash = "SHA-1";
		let result;
		let afterKeyIsImported = (p1) => {
			EcAesCtrAsync.fipsOn();
			try {
				result = forge.util.decodeUtf8(EcCrypto.ab2str(p1));
			} catch {
				result = EcCrypto.ab2str(p1);
			}
			if (EcCrypto.caching) {
				EcCrypto.decryptionCache[ppk.toPk().fingerprint() + cipherText] = result;
			}
			EcAesCtrAsync.fipsOff();
			return result;
		};
		if (ppk.key == null) {
			let keyUsages = [];
			keyUsages.push("decrypt");
			let p = crypto.subtle
				.importKey("jwk", ppk.toJwk(), algorithm, false, keyUsages)
				.then(function (key) {
					EcAesCtrAsync.fipsOn();
					ppk.key = key;
					return crypto.subtle.decrypt(
						algorithm,
						key,
						base64.decode(cipherText)
					);
				})
				.then(afterKeyIsImported)
				.catch((error) => {
					global.auditLogger.report(global.auditLogger.LogCategory.SYSTEM, global.auditLogger.Severity.ERROR, "EcRsaOaepAsyncDecrypt", ppk, cipherText, error);
					EcAesCtrAsync.fipsOff();
					return null;
				});
			return cassPromisify(p, success, failure);
		} else {
			let p = new Promise((resolve,reject)=>{
				EcAesCtrAsync.fipsOn();
				resolve(crypto.subtle
				.decrypt(algorithm, ppk.key, base64.decode(cipherText))
				.then(afterKeyIsImported)
				.catch((error) => {
					global.auditLogger.report(global.auditLogger.LogCategory.SYSTEM, global.auditLogger.Severity.ERROR, "EcRsaOaepAsyncDecrypt", error);
					EcAesCtrAsync.fipsOff();
					return null;
				}))});
			return cassPromisify(p, success, failure);
		}
	}
	/**
	 *  Asynchronous form of {{#crossLink
	 *  "EcRsaOaep/sign:method"}}EcRsaOaep.sign{{/crossLink}}
	 *
	 *  @param {EcPpk}            ppk Public private keypair to use to sign message.
	 *  @param {string}           text Text to sign.
	 *  @param {function(string)} success Success method, result is Base64
	 *                            encoded signature.
	 *  @param {function(string)} failure Failure method, parameter is error
	 *                            message.
	 *  @method sign
	 *  @static
	 */
	static sign(ppk, text, success, failure) {
		if (EcCrypto.testMode)
			console.log("sign (sha1): " + text)
		if (crypto?.subtle == null || (typeof process !== 'undefined' && process?.env?.FIPS)) {
			return EcRsaOaep.sign(ppk, text, success, failure); //NOSONAR -- This is a Fallback method.
		}
		if (text == null) {
			return cassReturnAsPromise(null, success, failure);
		}
		EcAesCtrAsync.fipsOff();// OPENSSL3 signing with this method not allowed. See https://github.com/Lomilar/node-fips-rsassa-pkcs1-15-sha1/tree/main
		let keyUsages = ["sign"];
		let algorithm = {};
		algorithm.name = "RSASSA-PKCS1-v1_5";
		algorithm.hash = "SHA-1";
		if (ppk.signKey == null)
			return cassPromisify(
				crypto.subtle
					.importKey("jwk", ppk.toJwk(), algorithm, false, keyUsages)
					.then(function (key) {
						EcAesCtrAsync.fipsOff();// OPENSSL3 signing with this method not allowed. See https://github.com/Lomilar/node-fips-rsassa-pkcs1-15-sha1/tree/main
						ppk.signKey = key;
						return crypto.subtle
							.sign(
								algorithm,
								key,
								EcCrypto.str2ab(forge.util.encodeUtf8(text))
							)
							.then(function (p1) {
								//EcAesCtrAsync.fipsOff();// OPENSSL3 signing with this method not allowed. See https://github.com/Lomilar/node-fips-rsassa-pkcs1-15-sha1/tree/main
								return base64.encode(p1);
							});
					}),
				success,
				failure
			);
		else
			return cassPromisify(new Promise((resolve,reject)=>{
				EcAesCtrAsync.fipsOff();// OPENSSL3 signing with this method not allowed. See https://github.com/Lomilar/node-fips-rsassa-pkcs1-15-sha1/tree/main
				resolve(crypto.subtle
					.sign(
						algorithm,
						ppk.signKey,
						EcCrypto.str2ab(forge.util.encodeUtf8(text))
					)
					.then(function (p1) {
						return base64.encode(p1);
					}))}),
				success,
				failure
			);
	}
	/**
	 *  Asynchronous form of {{#crossLink
	 *  "EcRsaOaep/signSha256:method"}}EcRsaOaep.signSha256{{/crossLink}}
	 *
	 *  @param {EcPpk}            ppk Public private keypair to use to sign message.
	 *  @param {string}           text Text to sign.
	 *  @param {function(string)} success Success method, result is Base64
	 *                            encoded signature.
	 *  @param {function(string)} failure Failure method, parameter is error
	 *                            message.
	 *  @method signSha256
	 *  @static
	 */
	static signSha256 = function (ppk, text, success, failure) {
		if (EcCrypto.testMode)
			console.log("sign (sha256): " + text)
		if (crypto?.subtle == null) {
			return EcRsaOaep.sign(ppk, text, success, failure); //NOSONAR -- This is a Fallback method.
		}
		EcAesCtrAsync.fipsOn();
		let keyUsages = [];
		keyUsages.push("sign");
		let algorithm = {};
		algorithm.name = "RSASSA-PKCS1-v1_5";
		algorithm.hash = "SHA-256";
		let p = null;
		if (ppk.signKey256 == null)
			p = crypto.subtle
				.importKey("jwk", ppk.toJwk(), algorithm, false, keyUsages)
				.then(function (key) {
					EcAesCtrAsync.fipsOn();
					ppk.signKey256 = key;
					return crypto.subtle.sign(
						algorithm,
						key,
						EcCrypto.str2ab(forge.util.encodeUtf8(text))
					);
				});
		else
			p = crypto.subtle.sign(
				algorithm,
				ppk.signKey256,
				EcCrypto.str2ab(forge.util.encodeUtf8(text))
			);

		p = p.then(function (p1) {								
			EcAesCtrAsync.fipsOff();
			return base64.encode(p1);
		});
		return cassPromisify(p, success, failure);
	};
	/**
	 *  Asynchronous form of {{#crossLink
	 *  "EcRsaOaep/verify:method"}}EcRsaOaep.verify{{/crossLink}}
	 *
	 *  @param {EcPk}              pk Public key to use to verify message.
	 *  @param {string}            text Text to use in verification.
	 *  @param {string}            signature Signature to use in verification.
	 *  @param {function(boolean)} success Success method, result is whether
	 *                             signature is valid.
	 *  @param {function(string)}  failure Failure method, parameter is error
	 *                             message.
	 *  @method verify
	 *  @static
	 */
	static verify(pk, text, signature, success, failure) {
		if (EcCrypto.testMode)
			console.log("verify (sha1): " + text)
		if (crypto?.subtle == null) {
			return EcRsaOaep.verify(pk, text, signature, success, failure); //NOSONAR -- This is a Fallback method.
		}
		EcAesCtrAsync.fipsOn();
		let algorithm = {};
		algorithm.name = "RSASSA-PKCS1-v1_5";
		algorithm.hash = "SHA-1";
		if (pk.signKey == null) {
			let keyUsages = [];
			keyUsages.push("verify");
			return cassPromisify(
				crypto.subtle
					.importKey("jwk", pk.toJwk(), algorithm, false, keyUsages)
					.then((key) => {
						EcAesCtrAsync.fipsOn();
						pk.signKey = key;
						return crypto.subtle.verify(
							algorithm,
							key,
							base64.decode(signature),
							EcCrypto.str2ab(forge.util.encodeUtf8(text))
						).then((result)=>{						
							EcAesCtrAsync.fipsOff();
							return result;
						});
					}),
				success,
				failure
			);
		} else {
			return cassPromisify(new Promise((resolve,reject)=>{				
				EcAesCtrAsync.fipsOn();
				resolve(crypto.subtle.verify(
					algorithm,
					pk.signKey,
					base64.decode(signature),
					EcCrypto.str2ab(forge.util.encodeUtf8(text))
				).then((result)=>{						
					EcAesCtrAsync.fipsOff();
					return result;
				}))})
			,
				success,
				failure
			);
		}
	}
	/**
	 *  Asynchronous form of {{#crossLink
	 *  "EcRsaOaep/verify:method"}}EcRsaOaep.verify{{/crossLink}}
	 *
	 *  @param {EcPk}              pk Public key to use to verify message.
	 *  @param {string}            text Text to use in verification.
	 *  @param {string}            signature Signature to use in verification.
	 *  @param {function(boolean)} success Success method, result is whether
	 *                             signature is valid.
	 *  @param {function(string)}  failure Failure method, parameter is error
	 *                             message.
	 *  @method verify
	 *  @static
	 */
	static verifySha256(pk, text, signature, success, failure) {
		if (EcCrypto.testMode)
			console.log("verify (sha256): " + text)
		if (crypto?.subtle == null) {
			return EcRsaOaep.verify(pk, text, signature, success, failure); //NOSONAR -- This is a Fallback method.
		}
		EcAesCtrAsync.fipsOn();
		let algorithm = {};
		algorithm.name = "RSASSA-PKCS1-v1_5";
		algorithm.hash = "SHA-256";
		if (pk.signKey256 == null) {
			let keyUsages = [];
			keyUsages.push("verify");
			return cassPromisify(
				crypto.subtle
					.importKey("jwk", pk.toJwk(), algorithm, false, keyUsages)
					.then(function (key) {			
						EcAesCtrAsync.fipsOn();
						pk.signKey256 = key;
						return crypto.subtle.verify(
							algorithm,
							key,
							base64.decode(signature),
							EcCrypto.str2ab(forge.util.encodeUtf8(text))
						).then((result)=>{						
							EcAesCtrAsync.fipsOff();
							return result;
						});
					}),
				success,
				failure
			);
		} else {
			return cassPromisify(new Promise((resolve,reject)=>{
				EcAesCtrAsync.fipsOn();
				resolve(crypto.subtle.verify(
					algorithm,
					pk.signKey256,
					base64.decode(signature),
					EcCrypto.str2ab(forge.util.encodeUtf8(text))
				).then((result)=>{						
					EcAesCtrAsync.fipsOff();
					return result;
				}))}),
				success,
				failure
			);
		}
	}
};
