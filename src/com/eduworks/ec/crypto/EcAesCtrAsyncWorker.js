let forge = require("node-forge");
let EcCrypto = require("./EcCrypto.js");
let EcRsaOaepAsyncWorker = require("./EcRsaOaepAsyncWorker.js");
let cassPromisify = require("../promises/helpers.js").cassPromisify;
let cassReturnAsPromise = require("../promises/helpers.js").cassReturnAsPromise;
/**
 *  Asynchronous implementation of {{#crossLink
 *  "EcAesCtr"}}EcAesCtr{{/crossLink}}. Uses web workers and assumes 8 workers.
 *
 *  @author fritz.ray@eduworks.com
 *  @class EcAesCtrAsyncWorker
 *  @module com.eduworks.ec
 */
module.exports = class EcAesCtrAsyncWorker {
	/**
	 *  Asynchronous form of {{#crossLink
	 *  "EcAesCtr/encrypt:method"}}EcAesCtr.encrypt{{/crossLink}}
	 *
	 *  @param {string}           plaintext Text to encrypt.
	 *  @param {string}           secret Secret to use to encrypt.
	 *  @param {string}           iv Initialization Vector to use to encrypt.
	 *  @param {function(string)} success Success method, result is Base64
	 *                            encoded Ciphertext.
	 *  @param {function(string)} failure Failure method, parameter is error
	 *                            message.
	 *  @method encrypt
	 *  @static
	 */
	static encrypt(plaintext, secret, iv, success, failure) {
		EcRsaOaepAsyncWorker.initWorker();
		if (EcRsaOaepAsyncWorker.w?.[EcRsaOaepAsyncWorker.rotator] == null) {
			return cassReturnAsPromise(
				EcAesCtrAsync.encrypt(plaintext, secret, iv),
				success,
				failure
			);
		}
		let worker = EcRsaOaepAsyncWorker.rotator++;
		EcRsaOaepAsyncWorker.rotator = EcRsaOaepAsyncWorker.rotator % EcRsaOaepAsyncWorker.rotations;
		let o = {};
		o["secret"] = secret;
		o["iv"] = iv;
		o["text"] = forge.util.encodeUtf8(plaintext);
		o["cmd"] = "encryptAesCtr";
		o["origin"] = "cassproject";
		return EcRsaOaepAsyncWorker.w[worker].postMessage(o, 'cassproject');
	}
	/**
	 *  Asynchronous form of {{#crossLink
	 *  "EcAesCtr/decrypt:method"}}EcAesCtr.decrypt{{/crossLink}}
	 *
	 *  @param {string}           ciphertext Text to decrypt.
	 *  @param {string}           secret Secret to use to decrypt.
	 *  @param {string}           iv Initialization Vector to use to decrypt.
	 *  @param {function(string)} success Success method, result is Plaintext
	 *                            with no encoding.
	 *  @param {function(string)} failure Failure method, parameter is error
	 *                            message.
	 *  @method decrypt
	 *  @static
	 */
	static decrypt(ciphertext, secret, iv, success, failure) {
		if (EcCrypto.caching) {
			let cacheGet = null;
			cacheGet = EcCrypto.decryptionCache[secret + iv + ciphertext];
			if (cacheGet != null) {
				return cassReturnAsPromise(cacheGet, success, failure);
			}
		}
		EcRsaOaepAsyncWorker.initWorker();
		if (EcRsaOaepAsyncWorker.w?.[EcRsaOaepAsyncWorker.rotator] == null) {
			return cassReturnAsPromise(
				EcAesCtrAsync.decrypt(ciphertext, secret, iv),
				success,
				failure
			);
		}
		let worker = EcRsaOaepAsyncWorker.rotator++;
		EcRsaOaepAsyncWorker.rotator = EcRsaOaepAsyncWorker.rotator % EcRsaOaepAsyncWorker.rotations;
		let o = {};
		o["secret"] = secret;
		o["iv"] = iv;
		o["text"] = ciphertext;
		o["cmd"] = "decryptAesCtr";
		o["origin"] = "cassproject";
		let p = EcRsaOaepAsyncWorker.w[worker].postMessage(o,'cassproject');
		p = p.then((decrypted) => {
			return forge.util.decodeUtf8(decrypted);
		});
		if (EcCrypto.caching)
			p = p.then((decrypted) => {
				EcCrypto.decryptionCache[secret + iv + ciphertext] = decrypted;
				return decrypted;
			});
		return cassPromisify(p, success, failure);
	}
};
