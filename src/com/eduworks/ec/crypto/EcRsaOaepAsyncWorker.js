
if (global.Worker === undefined || global.Worker == null)
	global.Worker = require("web-worker");
let PromiseWorker = require("promise-worker");
const path = require('path');
const url = require('url');
const EcCrypto = require("./EcCrypto.js");
const forge = require("node-forge");
const cassPromisify = require("../promises/helpers.js").cassPromisify;
const cassReturnAsPromise = require("../promises/helpers.js").cassReturnAsPromise;
require("../../../../org/cassproject/general/AuditLogger.js");
const EcRsaOaep = require("./EcRsaOaep.js")

/**
 *  Asynchronous implementation of {{#crossLink
 *  "EcRsaOaep"}}EcRsaOaep{{/crossLink}}. Uses web workers and assumes 8 workers.
 *
 *  @author fritz.ray@eduworks.com
 *  @class this
 *  @module com.eduworks.ec
 */
module.exports = class EcRsaOaepAsyncWorker {
	static encryptCounter = 0;
	static decryptCounter = 0;
	static signCounter = 0;
	static verifyCounter = 0;
	static rotator = 0;
	static rotations = 8;
	static w = null;
	static teardown() {
		if (this.w != null)
			for (let worker of this.w)
				worker._worker.terminate();
		this.w = null;
	}
	static initWorker() {
		if (Worker == undefined || Worker == null) {
			return;
		}
		if (this.w != null) {
			return;
		}
		this.rotator = 0;
		this.w = [];
		for (let index = 0; index < EcRsaOaepAsyncWorker.rotations; index++) {
			this.createWorker(index);
		}
	}
	static createWorker(index) {
		let wkr = null;
		let me = this;
		try {
			wkr = new Worker(url.pathToFileURL(path.resolve(__dirname, 'forgeAsyncNode.js')));
		} catch (e) {
			global.auditLogger.report(global.auditLogger.LogCategory.SYSTEM, global.auditLogger.Severity.ERROR, "EcRsaOaepAsyncWorker", e);
		}
		if (wkr == null)
			try {
				wkr = new Worker(url.pathToFileURL(path.resolve(__dirname, 'forgeAsync.js')));
			} catch (e) {
				global.auditLogger.report(global.auditLogger.LogCategory.SYSTEM, global.auditLogger.Severity.ERROR, "EcRsaOaepAsyncWorker", e);
			}
		if (wkr == null)
			try {
				wkr = new Worker(path.resolve(__dirname, 'forgeAsync.js'));
				wkr.onerror = function (event) {
					wkr = null;
					global.auditLogger.report(global.auditLogger.LogCategory.SYSTEM, global.auditLogger.Severity.ERROR, "EcRsaOaepAsyncWorker", event);
					wkr = new Worker(path.resolve(__dirname, 'cass-editor/forgeAsync.js'));
					if (wkr != null) {
						// replace errored worker at index
						me.w[index] = (new PromiseWorker(wkr));
					}
				}
			} catch (e) {
				global.auditLogger.report(global.auditLogger.LogCategory.SYSTEM, global.auditLogger.Severity.ERROR, "EcRsaOaepAsyncWorker", e);
				// Eat quietly.
			}
		if (wkr != null)
			this.w[index] = (new PromiseWorker(wkr));
	}
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
	static encrypt(pk, plaintext, success, failure) {
		this.initWorker();
		if (!EcCrypto.testMode)
			if (this.w?.[this.rotator] == null) {
				return cassPromisify(EcRsaOaepAsync.encrypt(pk, plaintext), success, failure);
			}
		let worker = this.rotator++;
		this.rotator = this.rotator % EcRsaOaepAsyncWorker.rotations;
		let o = {};
		o["pk"] = pk.toPem();
		o["text"] = plaintext;
		o["cmd"] = "encryptRsaOaep";
		o["origin"] = "cassproject";

		let p = this.w[worker].postMessage(o, 'cassproject');
		EcRsaOaepAsyncWorker.encryptCounter++;
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
	static decrypt(ppk, ciphertext, success, failure) {
		if (EcCrypto.caching) {
			let cacheGet = null;
			cacheGet = EcCrypto.decryptionCache[ppk.toPk().fingerprint() + ciphertext];
			if (cacheGet != null) {
				return cassReturnAsPromise(cacheGet, success, failure);
			}
		}
		this.initWorker();
		if (!EcCrypto.testMode)
			if (this.w?.[this.rotator] == null) {
				return cassPromisify(EcRsaOaepAsync.decrypt(ppk, ciphertext), success, failure);
			}
		let worker = this.rotator++;
		this.rotator = this.rotator % EcRsaOaepAsyncWorker.rotations;
		let o = {};
		o["ppk"] = ppk.toPem();
		o["text"] = ciphertext;
		o["cmd"] = "decryptRsaOaep";
		o["origin"] = "cassproject";
		let p = this.w[worker].postMessage(o, 'cassproject');
		p = p.then(function (decrypted) {
			return forge.util.decodeUtf8(decrypted);
		});
		if (EcCrypto.caching)
			p = p.then(function (decrypted) {
				EcCrypto.decryptionCache[ppk.toPk().fingerprint() + ciphertext] = decrypted;
				return decrypted;
			});
		EcRsaOaepAsyncWorker.decryptCounter++;
		return cassPromisify(p, success, failure);
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
		this.initWorker();
		if (!EcCrypto.testMode)
			if (this.w?.[this.rotator] == null) {
				return cassPromisify(EcRsaOaepAsync.sign(ppk, text), success, failure);
			}
		let worker = this.rotator++;
		this.rotator = this.rotator % EcRsaOaepAsyncWorker.rotations;
		let o = {};
		o["ppk"] = ppk.toPem();
		o["text"] = forge.util.encodeUtf8(text);
		o["cmd"] = "signRsaOaep";
		o["origin"] = "cassproject";
		let p = this.w[worker].postMessage(o, 'cassproject');
		EcRsaOaepAsyncWorker.signCounter++;
		return cassPromisify(p, success, failure);
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
		this.initWorker();
		if (!EcCrypto.testMode)
			if (this.w?.[this.rotator] == null) {
				return cassPromisify(EcRsaOaepAsync.signSha256(ppk, text), success, failure);
			}
		let worker = this.rotator++;
		this.rotator = this.rotator % EcRsaOaepAsyncWorker.rotations;
		let o = {};
		o["ppk"] = ppk.toPem();
		o["text"] = forge.util.encodeUtf8(text);
		o["cmd"] = "signSha256RsaOaep";
		o["origin"] = "cassproject";
		let p = this.w[worker].postMessage(o, 'cassproject');
		EcRsaOaepAsyncWorker.signCounter++;
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
		this.initWorker();
		if (this.w?.[this.rotator] == null) {
			return cassPromisify(EcRsaOaepAsync.verify(pk, text, signature), success, failure);
		}
		let worker = this.rotator++;
		this.rotator = this.rotator % EcRsaOaepAsyncWorker.rotations;
		let o = {};
		o["pk"] = pk.toPem();
		o["text"] = forge.util.encodeUtf8(text);
		o["signature"] = signature;
		o["cmd"] = "verifyRsaOaep";
		o["origin"] = "cassproject";
		let p = this.w[worker].postMessage(o, 'cassproject');
		EcRsaOaepAsyncWorker.verifyCounter++;
		return cassPromisify(p, success, failure);
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
		this.initWorker();
		if (this.w?.[this.rotator] == null) {
			return cassPromisify(EcRsaOaepAsync.verify(pk, text, signature), success, failure);
		}
		let worker = this.rotator++;
		this.rotator = this.rotator % EcRsaOaepAsyncWorker.rotations;
		let o = {};
		o["pk"] = pk.toPem();
		o["text"] = forge.util.encodeUtf8(text);
		o["signature"] = signature;
		o["cmd"] = "verifyRsaOaepSha256";
		o["origin"] = "cassproject";
		let p = this.w[worker].postMessage(o, 'cassproject');
		EcRsaOaepAsyncWorker.verifyCounter++;
		return cassPromisify(p, success, failure);
	}
};
