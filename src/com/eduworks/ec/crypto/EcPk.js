var pemJwk = require('pem-jwk');
/**
 *  Helper classes for dealing with RSA Public Keys.
 * 
 *  @author fritz.ray@eduworks.com
 *  @class EcPk
 *  @module com.eduworks.ec
 */
module.exports = class EcPk{
    static cache = {};
    pk = null;
    defaultPem = null;
    jwk = null;
    key = null;
    signKey = null;
    /**
     *  Decodes a PEM encoded SubjectPublicKeyInfo (PKCS#8) or RSAPublicKey (PKCS#1) formatted RSA Public Key.
     *  (In case you were curious.)
     * 
     *  @param {string} pem PEM as a string.
     *  @return {EcPk} Object used to perform public key operations.
     *  @method fromPem
     *  @static
     */
    static fromPem(pem) {
        var pk = (EcPk.cache)[pem];
        if (pk != null) 
            return pk;
        pk = new EcPk();
        try {
            pk.pk = forge.pki.publicKeyFromPem(pem);
        }catch (ex) {
            return null;
        }
        (EcPk.cache)[pem] = pk;
        return pk;
    };
    /**
     *  Compares two public keys, and returns true if their PEM forms match.
     * 
     *  @param {EcPk} obj Object to compare to.
     *  @return {boolean} True if the keys match.
     *  @method equals
     */
    equals(obj) {
        if (obj instanceof EcPk)
            return this.toPem().equals((obj).toPem());
        return Object.equals.call(this, obj);
    };
    /**
     *  Encodes the public key into a PEM encoded SubjectPublicKeyInfo (PKCS#8) formatted RSA Public Key.
     *  (In case you were curious.)
     * 
     *  @return {string} PEM encoded public key without whitespace.
     *  @method toPem
     */
    toPem() {
        if (this.defaultPem == null) 
            this.defaultPem = forge.pki.publicKeyToPem(this.pk).replaceAll("\r", "").replaceAll("\n", "");
        return this.defaultPem;
    };
    /**
     *  Encodes the public key into a PEM encoded RSAPublicKey (PKCS#1) formatted RSA Public Key.
     *  (In case you were curious.)
     * 
     *  @return {string} PEM encoded public key without whitespace.
     *  @method toPkcs1Pem
     */
    toPkcs1Pem = function() {
        return forge.pki.publicKeyToRSAPublicKeyPem(this.pk).replaceAll("\r", "").replaceAll("\n", "");
    };
    /**
     *  Encodes the public key into a PEM encoded SubjectPublicKeyInfo (PKCS#8) formatted RSA Public Key.
     *  (In case you were curious.)
     * 
     *  @return {string} PEM encoded public key without whitespace.
     *  @method toPkcs8Pem
     */
    toPkcs8Pem = function() {
        return forge.pki.publicKeyToPem(this.pk).replaceAll("\r", "").replaceAll("\n", "");
    };

    toJwk() {
        if (this.jwk == null) 
            this.jwk = pemJwk.pem2jwk(forge.pki.publicKeyToPem(this.pk));
        return this.jwk;
    };
    /**
     *  Hashes the public key into an SSH compatible fingerprint.
     * 
     *  @return {string} Public key fingerprint.
     *  @method fingerprint
     */
    fingerprint() {
        var o = new Object();
        (o)["encoding"] = "hex";
        return forge.ssh.getPublicKeyFingerprint(this.pk, o);
    };
    verify(bytes, decode64) {
        return this.pk.verify(bytes, decode64);
    };
};