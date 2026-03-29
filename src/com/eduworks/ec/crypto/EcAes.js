const forge = require("node-forge");
const realCrypto = require('crypto');
const base64 = require("base64-arraybuffer");

/**
 *  AES encryption tasks common across all variants of AES.
 *  @class EcAes
 *  @module com.eduworks.ec
 *  @author fritz.ray@eduworks.com
 */
module.exports = class EcAes {
	/**
	 *  Generates a random secret of length @i
	 *  @method newSecret
	 *  @static
	 *  @param {integer} i Length of secret
	 *  @return {string} String representing the new secret, encoded using Base64.
	 */
	static newSecret = function(i) {
		if (i == null) throw new Error("Undefined secret length.");
		let array = new Uint8Array(i);
		if (typeof crypto !== "undefined" && crypto.getRandomValues) {
			crypto.getRandomValues(array);
		} else {
			realCrypto.webcrypto.getRandomValues(array);
		}
		return base64.encode(array.buffer);
	};
	/**
	 *  Generates a random Initialization Vector of length @i
	 *  @method newIv
	 *  @static
	 *  @param {integer} i Length of initialization Vector
	 *  @return {string} String representing the new Initialization Vector, encoded using Base64.
	 */
	static newIv = function(i) {
		if (i == null) throw new Error("Undefined iv length.");
		let array = new Uint8Array(i);
		if (typeof crypto !== "undefined" && crypto.getRandomValues) {
			crypto.getRandomValues(array);
		} else {
			realCrypto.webcrypto.getRandomValues(array);
		}
		return base64.encode(array.buffer);
	};
};
