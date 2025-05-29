const forge = require("node-forge");
const realCrypto = require('crypto');
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
		return forge.util.encode64(forge.random.getBytesSync(i));
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
		return realCrypto.randomBytes(i).toString('base64');
	};
};
