const EcArray = require("../../../../com/eduworks/ec/array/EcArray.js");
const EcObject = require("../../../../com/eduworks/ec/array/EcObject.js");
const EcCrypto = require("../../../../com/eduworks/ec/crypto/EcCrypto.js");
const EcPk = require("../../../../com/eduworks/ec/crypto/EcPk.js");
const EcPpkFacade = require("../../../../com/eduworks/ec/crypto/EcPpkFacade.js");
const EcRsaOaepAsync = require("../../../../com/eduworks/ec/crypto/EcRsaOaepAsync.js");
const EcLinkedData = require("../../../json/ld/EcLinkedData.js");
const Ebac = require("./Ebac.js");
require("../../general/AuditLogger.js")

/**
 *  Data wrapper to represent remotely hosted data. Includes necessary KBAC fields for
 *  permission controls, signing, identifying and locating the object.
 *
 *  @author fritz.ray@eduworks.com
 *  @class EcRemoteLinkedData
 *  @extends EcLinkedData
 *  @module org.cassproject
 */

module.exports = class EcRemoteLinkedData extends EcLinkedData {
	/**
	 *  Constructor for remote linked data object.
	 *
	 *  @param {string} context JSON-LD Context.
	 *  @param {string} type JSON-LD Type.
	 *  @constructor
	 */
	constructor(context, type) {
		super(context, type);
	}
	/**
	 *  PEM encoded public keys of the owner of the object. A repository, upon
	 *  receiving a write operation, will ensure either the data did not
	 *  previously exist, or that an owner has provided a signature authorizing
	 *  the replacement of the old data with the new data.
	 *
	 *  @property owner
	 *  @type string[] (PEM)
	 */
	owner = null;
	/**
	 *  Signatures of the object. The signing method is as follows: Remove the
	 *  signature field. Encode the object and its fields in ascii-sort order
	 *  JSON-LD using a space-free, tab-free encoding. Sign the aforementioned
	 *  string.
	 *
	 *  @property signature
	 *  @type string[] (Base64)
	 */
	signature = null;
	/**
	 *  URL/URI used to retrieve, store and identify the object.
	 *
	 *  @property id
	 *  @type string (URL)
	 */
	id = null;

	equals(obj) {
		return this.isId(obj.id);
	}

	/**
	 *  PEM encoded public keys of identities authorized to view the object. A
	 *  repository will ignore write operations from these identities, but will
	 *  allow them to read the object.
	 *
	 *  @property reader
	 *  @type string[] (PEM)
	 */
	reader = null;
	/**
	 *  Removes the version information from an identifier.
	 *  Warning: Will remove identifier if the identifier is composed solely of digits!!!
	 *
	 *  @param {string} id Slash delimited URL or path.
	 *  @return ID without version.
	 *  @method trimVersionFromUrl
	 *  @static
	 */
	static trimVersionFromUrl(id) {
		if (id == null) return null;
		if (
			id.indexOf("/api/data/") == -1 &&
			id.indexOf("/api/custom/data/") == -1
		)
			return id;
		if (!id.substring(id.lastIndexOf("/")).match("^\\/[0-9]+$")) return id;
		var rawId = id.substring(0, id.lastIndexOf("/"));
		if (rawId.endsWith("/")) rawId = rawId.substring(0, rawId.length - 1);
		return rawId;
	}
	/**
	 *  Will generate an identifier using the server URL provided (usually from
	 *  an EcRepository).
	 *
	 *  @param {string} server Base URL of the server's repository functionality.
	 *  @method generateId
	 */
	generateId(server) {
		this.id = server;
		if (!this.id.endsWith("/") && !this.id.endsWith("ce-")) this.id += "/";
		this.id += "data/";
		this.id += this.getDottedType();
		this.id += "/";
		this.id += EcCrypto.generateUUID();
		this.id += "/";
		this.id += new Date().getTime();
	}
	/**
	 *  Will generate an short (non-versioned) identifier using the server URL provided (usually from
	 *  an EcRepository).
	 *
	 *  @param {string} server Base URL of the server's repository functionality.
	 *  @method generateShortId
	 */
	generateShortId(server) {
		this.id = server;
		if (!this.id.endsWith("/") && !this.id.endsWith("ce-")) this.id += "/";
		this.id += EcCrypto.generateUUID();
	}
	getDottedType() {
		return this.getFullType()
			.replace("http://", "")
			.replace("https://", "")
			.replace(/\//g, ".");
	}
	/**
	 *  Will generate an identifier using the server URL provided (usually from
	 *  an EcRepository) and unique identifier.
	 *
	 *  @param {string} server Base URL of the server's repository functionality.
	 *  @param {string} uniqueIdentifier Canonical identifier. Must contain a letter or symbol.
	 *  @method assignId
	 */
	assignId(server, uniqueIdentifier) {
		this.id = server;
		if (!this.id.endsWith("/")) this.id += "/";
		this.id += "data/";
		this.id += this.getDottedType();
		this.id += "/";
		this.id += uniqueIdentifier;
		this.id += "/";
		this.id += new Date().getTime();
	}
	/**
	 *  Will generate an identifier using the server URL provided (usually from
	 *  an EcRepository) and unique identifier.
	 *
	 *  @param {string} server Base URL of the server's repository functionality.
	 *  @param {string} uniqueIdentifier Canonical identifier. Must contain a letter or symbol.
	 *  @method assignId
	 */
	static veryShortId(server, uniqueIdentifier) {
		var id;
		id = server;
		if (!id.endsWith("/")) id += "/";
		id += "data/";
		id += uniqueIdentifier;
		return id;
	}
	/**
	 *  Will generate an identifier using the server URL provided (usually from
	 *  an EcRepository) and unique identifier.
	 *
	 *  @param {string} server Base URL of the server's repository functionality.
	 *  @param {string} uniqueIdentifier Canonical identifier. Must contain a letter or symbol.
	 *  @method assignId
	 */
	assignIdAndVersion(server, uniqueIdentifier, version) {
		this.id = server;
		if (!this.id.endsWith("/")) this.id += "/";
		this.id += "data/";
		this.id += this.getDottedType();
		this.id += "/";
		this.id += uniqueIdentifier;
		this.id += "/";
		this.id += version;
	}
	/**
	 *  Determines if the object has an owner identified by pk.
	 *  Homogenizes the PEM strings for comparison.
	 *  Homogenization is necessary for comparing PKCS#1 and PKCS#8 or PKs with Certificates, etc.
	 *
	 *  @param {EcPk} pk Public Key of the owner.
	 *  @return {boolean} True if owner is represented by the PK, false otherwise.
	 *  @method hasOwner
	 */
	hasOwner(pk) {
		if (this.owner == null) return false;
		var pkPem = pk.toPem();
		for (var i = 0; i < this.owner.length; i++)
			if (pkPem == EcPk.fromPem(this.owner[i]).toPem()) return true;
		return false;
	}
	/**
	 *  Determines if the object has a reader identified by pk.
	 *  Homogenizes the PEM strings for comparison.
	 *  Homogenization is necessary for comparing PKCS#1 and PKCS#8 or PKs with Certificates, etc.
	 *
	 *  @param {EcPk} pk Public Key of the owner.
	 *  @return {boolean} True if owner is represented by the PK, false otherwise.
	 *  @method hasOwner
	 */
	hasReader(pk) {
		if (this.reader == null) return false;
		var pkPem = pk.toPem();
		for (var i = 0; i < this.reader.length; i++)
			if (pkPem == EcPk.fromPem(this.reader[i]).toPem()) return true;
		return false;
	}
	/**
	 *  Determines if the PK matches an owner or if the object is public.
	 *  Homogenizes the PEM strings for comparison.
	 *  Homogenization is necessary for comparing PKCS#1 and PKCS#8 or PKs with Certificates, etc.
	 *
	 *  @param {EcPk} pk Public Key of the owner.
	 *  @return {boolean} True if owner is represented by the PK, false otherwise.
	 *  @method canEdit
	 */
	canEdit(pk) {
		if (this.owner == null || this.owner.length == 0) return true;
		return this.hasOwner(pk);
	}
	/**
	 *  Determines if the PK matches an owner or if the object is public.
	 *  Homogenizes the PEM strings for comparison.
	 *  Homogenization is necessary for comparing PKCS#1 and PKCS#8 or PKs with Certificates, etc.
	 *
	 *  @param {EcPk} pk Public Key of the owner.
	 *  @return {boolean} True if owner is represented by the PK, false otherwise.
	 *  @method canEdit
	 */
	canEditAny(ids) {
		if (this.owner == null || this.owner.length == 0) return true;
		if (ids == null) return false;
		for (var i = 0; i < ids.length; i++)
			if (this.hasOwner(ids[i])) return true;
		return false;
	}
	/**
	 *  Sign this object using a private key.
	 *  Does not check for ownership, objects signed with keys absent from owner or reader may be removed.
	 *
	 *  @param {EcPpk} ppk Public private keypair.
	 *  @method signWith
	 */
	async signWith(ppk) {
		if (ppk instanceof EcPpkFacade)
			return;
		var signableJson = this.toSignableJson();
		var signed = await EcRsaOaepAsync.sign(ppk, signableJson);
		if (this.signature != null) {
			for (var i = 0; i < this.signature.length; i++)
				if (this.signature[i] == signed) return;
		} else {
			this.signature = [];
		}
		this.signature.push(signed);
		return signed;
	}
	/**
	 *  Verifies the object's signatures.
	 *
	 *  @return {boolean} true if all of the signatures could be verified, false if they could not
	 *  @method verify
	 */
	async verify() {
		if (this.signature != null) {
			for (var i = 0; i < this.signature.length; ) {
				var works = false;
				var sig = this.signature[i];
				if (this.owner != null) {
					for (var j = 0; j < this.owner.length; j++) {
						var own = this.owner[j];
						var pk = EcPk.fromPem(own);
						var verify = false;
						try {
							verify = await EcRsaOaepAsync.verify(
								pk,
								this.toSignableJson(),
								sig
							);
							global.auditLogger.report(global.auditLogger.LogCategory.SYSTEM, global.auditLogger.Severity.INFO, "EcRemoteLDVerify", verify);
						} catch (ex) {
							verify = false;
						}
						if (verify == true) {
							works = true;
							break;
						}
					}
				}
				if (!works) return false;
				else i++;
			}
			if (this.signature.length == 0) return false;
			return true;
		}
		return false;
	}
	/**
	 *  Adds an owner to the object, if the owner does not exist.
	 *  Note that this method invalidates all signatures.
	 *
	 *  @param {EcPk} newOwner PK of the new owner.
	 *  @method addOwner
	 */
	addOwner(newOwner) {
		var pem = newOwner.toPem();
		if (this.owner == null) this.owner = [];
		for (var i = 0; i < this.owner.length; i++)
			if (this.owner[i] == pem) return;
		this.owner.push(pem);
		this.signature = null;
	}
	/**
	 *  Removes an owner from the object, if the owner does exist.
	 *  Note that this method invalidates all signatures.
	 *
	 *  @param {EcPk} oldOwner PK to remove.
	 *  @method removeOwner
	 */
	removeOwner(oldOwner) {
		var pem = oldOwner.toPem();
		if (this.owner == null) this.owner = [];
		for (var i = 0; i < this.owner.length; i++)
			if (this.owner[i] == pem) this.owner.splice(i, 1);
		this.signature = null;
	}
	/**
	 *  Adds a reader to the object, if the reader does not exist.
	 *  Note that this method invalidates all signatures.
	 *
	 *  @param {EcPk} newReader PK of the new reader.
	 *  @method addReader
	 */
	addReader(newReader) {
		var pem = newReader.toPem();
		if (this.reader == null) this.reader = [];
		EcArray.setAdd(this.reader, pem);
		this.signature = null;
	}
	/**
	 *  Removes a reader from the object, if the reader does exist.
	 *  Note that this method invalidates all signatures.
	 *
	 *  @param {EcPk} oldReader PK of the old reader.
	 *  @method removeReader
	 */
	removeReader(oldReader) {
		var pem = oldReader.toPem();
		if (this.reader == null) this.reader = [];
		EcArray.setRemove(this.reader, pem);
		this.signature = null;
	}
	/**
	 *  Determines if the object is not retrievable from a repository should it be written.
	 *
	 *  @return {boolean} True if the object is NOT VALID for storage, false otherwise.
	 *  @method invalid
	 */
	invalid() {
		if (this.id == null) return true;
		if (this.context == null) return true;
		if (this.getFullType() == null) return true;
		if (
			this.getFullType().indexOf("http://") == -1 &&
			this.getFullType().indexOf("https://") == -1
		)
			return true;
		return false;
	}
	/**
	 *  Updates the ID timestamp of the object, for versioning purposes.
	 *
	 *  @method updateTimestamp
	 */
	updateTimestamp() {
		if (this.getTimestamp() == null) return;
		var rawId = this.id.substring(0, this.id.lastIndexOf("/"));
		if (rawId.endsWith("/") == false) rawId += "/";
		rawId += new Date().getTime();
		this.id = rawId;
	}
	/**
	 *  Returns the ID timestamp of the object, for versioning purposes.
	 *
	 *  @method getTimestamp
	 */
	getTimestamp() {
		var timestamp = this.id.substring(this.id.lastIndexOf("/") + 1);
		if (timestamp.match("^[0-9]+$")) {
			return parseInt(timestamp);
		} else {
			return null;
		}
	}
	/**
	 *  Returns true if the provided ID represents this object.
	 *  Use this, as version information can make direct comparison difficult.
	 *
	 *  @param {string} id
	 *  @return {boolean} True if the provided ID represents this object.
	 *  @method isId
	 */
	isId(id) {
		return (
			EcRemoteLinkedData.trimVersionFromUrl(this.id) ==
			EcRemoteLinkedData.trimVersionFromUrl(id)
		);
	}
	/**
	 *  Return the ID of this object without the version information.
	 *  Used to reference the latest version of an object.
	 *
	 *  @return {string} ID of the latest version of this object.
	 *  @method shortId
	 */
	shortId() {
		return EcRemoteLinkedData.trimVersionFromUrl(this.id);
	}
	/**
	 *  Return the GUID portion of the short ID.
	 *
	 *  @return {string} Guid of the linked data object.
	 *  @method getGuid
	 */
	getGuid() {
		var shortId = EcRemoteLinkedData.trimVersionFromUrl(this.id);
		var parts = shortId.split("/");
		return parts[parts.length - 1];
	}
	/**
	 *  Return the URL Base portion of the short ID.
	 *
	 *  @return {string} Server Base URL of the linked data object.
	 *  @method getServerBaseUrl
	 */
	getServerBaseUrl() {
		var shortId = EcRemoteLinkedData.trimVersionFromUrl(this.id);
		var parts = shortId.split("/");
		return parts.slice(0, parts.indexOf("data")).join("/");
	}
	/**
	 *  Return a valid ElasticSearch search string that will retrieve all objects with this type.
	 *
	 *  @return {string} ElasticSearch compatible search string.
	 *  @method getSearchStringByType
	 */
	getSearchStringByType() {
		var types = this.getTypes();
		var result = "";
		for (var i = 0; i < types.length; i++) {
			if (i != 0) result += " OR ";
			result += '@type:"' + types[i] + '"';
			var lastSlash = types[i].lastIndexOf("/");
			result +=
				' OR (@context:"' +
				types[i].substring(0, lastSlash + 1) +
				'" AND @type:"' +
				types[i].substring(lastSlash + 1) +
				'")';
		}
		for (var i = 0; i < types.length; i++) {
			if (result != "") result += " OR ";
			result += '\\*encryptedType:"' + types[i] + '"';
			var lastSlash = types[i].lastIndexOf("/");
			result +=
				' OR (@context:"' +
				Ebac.context +
				'" AND \\*encryptedType:"' +
				types[i].substring(lastSlash + 1) +
				'")';
		}
		return "(" + result + ")";
	}
	asRdfXml(success, failure, signatureSheet) {
		var fd = new FormData();
		var id = this.id;
		if (signatureSheet != null || signatureSheet != undefined)
			fd.append("signatureSheet", signatureSheet);
		var headers = {};
		headers["Accept"] = "application/rdf+xml";
		return EcRemote.postWithHeadersExpectingString(
			id,
			"",
			fd,
			headers,
			success,
			failure
		);
	}
	asNQuads(success, failure, signatureSheet) {
		var fd = new FormData();
		var id = this.id;
		if (signatureSheet != null || signatureSheet != undefined)
			fd.append("signatureSheet", signatureSheet);
		var headers = {};
		headers["Accept"] = "text/n4";
		return EcRemote.postWithHeadersExpectingString(
			id,
			"",
			fd,
			headers,
			success,
			failure
		);
	}
	asTurtle(success, failure, signatureSheet) {
		var fd = new FormData();
		var id = this.id;
		if (signatureSheet != null || signatureSheet != undefined)
			fd.append("signatureSheet", signatureSheet);
		var headers = {};
		headers["Accept"] = "text/turtle";
		return EcRemote.postWithHeadersExpectingString(
			id,
			"",
			fd,
			headers,
			success,
			failure
		);
	}
	/**
	 *  Upgrades the object to the latest version, performing transforms and the like.
	 *
	 *  @method upgrade
	 */
	upgrade() {
		var me = this;
		if (me["@owner"] != null) {
			me["owner"] = me["@owner"];
		}
		if (me["@reader"] != null) {
			me["reader"] = me["@reader"];
		}
		if (me["@signature"] != null) {
			me["signature"] = me["@signature"];
		}
		if (me["@encryptedType"] != null) {
			me["encryptedType"] = me["@encryptedType"];
		}
		if (me["@encryptedContext"] != null) {
			me["encryptedContext"] = me["@encryptedContext"];
		}
		this.handleForwarding();
	}
	static forwardingTable = {};
	handleForwarding() {
		if (this.owner != null) {
			for (var i = 0; i < this.owner.length; i++) {
				var forwardTo = "";
				while (forwardTo != null) {
					var homogenizedPk = EcPk.fromPem(this.owner[i]).toPem();
					forwardTo =
						EcRemoteLinkedData.forwardingTable[homogenizedPk];
					if (forwardTo != null) this.owner[i] = forwardTo;
				}
			}
		}
		if (this.reader != null) {
			for (var i = 0; i < this.reader.length; i++) {
				var forwardTo = "";
				while (forwardTo != null) {
					var homogenizedPk = EcPk.fromPem(this.reader[i]).toPem();
					forwardTo =
						EcRemoteLinkedData.forwardingTable[homogenizedPk];
					if (forwardTo != null) this.reader[i] = forwardTo;
				}
			}
		}
	}
	static forwardKey(oldKey, newKey) {
		EcRemoteLinkedData.forwardingTable[oldKey] = newKey;
	}

	/**
	 *  Returns the name of the thing
	 *
	 *  @return {String} name of Thing
	 *  @memberOf Thing
	 *  @method getName
	 */
	getName() {
		var n = this.name;
		return EcRemoteLinkedData.getDisplayStringFrom(n);
	}
	/**
	 *  Method to set Thing name
	 *
	 *  @param {String} name
	 *                  Name to set for this Thing
	 *  @memberOf Thing
	 *  @method setName
	 */
	setName(name) {
		if (
			this.name != null &&
			EcObject.isObject(this.name) &&
			this.name["@value"] !== undefined
		) {
			var obj = this["name"];
			obj["@value"] = name;
			this["name"] = obj;
		} else {
			this.name = name;
		}
	}
	/**
	 *  Returns the description of the thing
	 *
	 *  @return {String} description of Thing
	 *  @memberOf Thing
	 *  @method getDescription
	 */
	getDescription() {
		var n = this.description;
		return schema.Thing.getDisplayStringFrom(n);
	}
	static getDisplayStringFrom(n) {
		if (n != null && EcArray.isArray(n)) {
			if (n.length > 0) n = n[0];
		}
		if (n != null && EcObject.isObject(n) && n["@value"] !== undefined) {
			return n["@value"];
		}
		return n;
	}
	/**
	 *  Method to set Thing description
	 *
	 *  @param {String} description
	 *                  Description to set for its Thing
	 *  @memberOf Thing
	 *  @method setDescription
	 */
	setDescription(description) {
		if (
			this.description != null &&
			EcObject.isObject(this.description) &&
			this.description["@value"] !== undefined
		) {
			var obj = this["description"];
			obj["@value"] = description;
			this["description"] = obj;
		} else {
			this.description = description;
		}
	}
};
