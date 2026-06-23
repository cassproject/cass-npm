let forge = require("node-forge");
/**
 *  @author Fritz
 *  @class EcCrypto
 */
module.exports = class EcCrypto {
	/**
	 *  Turn on (default off) caching of decrypted data.
	 *  @property caching
	 *  @type boolean
	 */
	static caching = false;
	static testMode = false;
	static deprecationNotice = false;
	static decryptionCache = {};
	static md5Cache = {};
	static sha256Cache = {};

	/**
	 *  Calculate MD5 hash of a string.
	 *  @param {String} s String to MD5
	 *  @return {String} MD5 hash
	 *  @static
	 *  @method md5
	 */
	static md5(s) {
		if (EcCrypto.testMode)
			console.log("md5: " + s)
		let m = null;
		if (EcCrypto.caching) {
			if (EcCrypto.md5Cache[s] === undefined) {
				m = forge.md.md5.create();
				m.update(s);
				EcCrypto.md5Cache[s] = m.digest().toHex();
			}
			return EcCrypto.md5Cache[s];
		}
		m = forge.md.md5.create();
		m.update(s);
		return m.digest().toHex();
	}

	/**
	 *  Calculate SHA-256 hash of a string.
	 *  @param {String} s String to SHA-256
	 *  @return {String} SHA-256 hash
	 *  @static
	 *  @method sha256
	 */
	static sha256(s) {
		if (EcCrypto.testMode)
			console.log("sha256: " + s)
		let m = null;
		if (EcCrypto.caching) {
			if (EcCrypto.sha256Cache[s] === undefined) {
				m = forge.md.sha256.create();
				m.update(s, "utf8");
				EcCrypto.sha256Cache[s] = m.digest().toHex();
			}
			return EcCrypto.sha256Cache[s];
		}
		m = forge.md.sha256.create();
		m.update(s, "utf8");
		return m.digest().toHex();
	}
	static ab2str(buf) {
		return new TextDecoder("utf-8").decode(buf);
	}
	static str2ab(str) {
		return new TextEncoder("utf-8").encode(str).buffer;
	}
	static generateUUID()
	{
		var d = new Date().getTime(); //Timestamp
		var d2 = ((typeof performance !== 'undefined') && performance.now && (performance.now() * 1000)) || 0;//Time in microseconds since page-load or 0 if unsupported
		return 'xxxxxxxx-c455-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
			var r = Math.random() * 16;//random number between 0 and 16
			if (d > 0) {//Use timestamp until depleted
				r = (d + r) % 16 | 0;
				d = Math.floor(d / 16);
			} else {//Use microseconds since page-load if supported
				r = (d2 + r) % 16 | 0;
				d2 = Math.floor(d2 / 16);
			}
			return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
		});
	}
};
