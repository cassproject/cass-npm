const EcArray = require("../../../com/eduworks/ec/array/EcArray");
const EcObject = require("../../../com/eduworks/ec/array/EcObject");
require("../../../org/cassproject/general/AuditLogger.js")

global.jsonld = require("jsonld");
/**
 *  Create a linked data object.
 *
 *  @param {string} context JSON-LD Context.
 *  @param {string} type JSON-LD Type.
 *  @constructor
 */
/**
 *  Represents a JSON-LD linked data object and performs serialization.
 *  Note: Serialization and deserialization remove parameters that begin with '@'.
 *  Note: This Linked Data Object is not assumed to have an @id field.
 *
 *  @author fritz.ray@eduworks.com
 *  @module org.json.ld
 *  @class EcLinkedData
 */ module.exports = class EcLinkedData {
	constructor(context, type) {
		this.setContextAndType(context, type);
	}
	static atProperties = ["id", "type", "schema", "context", "graph"];
	/**
	 *  JSON-LD @type field.
	 *
	 *  @property type
	 *  @type string
	 */
	type = null;
	/**
	 *  JSON-LD @context field.
	 *
	 *  @property context
	 *  @type string
	 */
	context = null;
	/**
	 *  Determines which fields to serialize into @fields.
	 *
	 *  @param {string} key Property name to check if it should be an @property.
	 *  @return {boolean} True if property is in the set of atProperties.
	 *  @internal
	 *  @static
	 *  @method isAtProperty
	 */
	static isAtProperty(key) {
		for (let atProperty of EcLinkedData.atProperties)
			if (atProperty == key) 
				return true;
		return false;
	}
	/**
	 *  Helper function to determine if a piece of data is probably a JSON
	 *  object.
	 *
	 *  @param {string} probableJson JSON to test.
	 *  @return {boolean} True if it is probably JSON. False if not.
	 *  @method isProbablyJson
	 *  @static
	 */
	static isProbablyJson(probableJson) {
		return (
			probableJson.trim().startsWith("{") &&
			probableJson.trim().endsWith("}")
		);
	}
	/**
	 *  Set the JSON-LD @context and @type.
	 *
	 *  @param {string} context JSON-LD Context.
	 *  @param {string} type JSON-LD Type.
	 *  @method setContextAndType
	 */
	setContextAndType(context, type) {
		this.context = context;
		this.type = type;
		if (type != null) {
			this.type = type.replace(context, "");
			if (this.type.startsWith("/")) this.type = this.type.substring(1);
		}
	}
	/**
	 *  Serializes this object to JSON.
	 *
	 *  @return {string} JSON formatted object (with JSON-LD fields).
	 *  @method toJson
	 */
	toJson() {
		let o = this.atIfy();
		return JSON.stringify(o);
	}
	/**
	 *  Forces Javascript to encode the object in alphabetical order in order to
	 *  make signature based actions more viable. Also places @(at) symbols in
	 *  front of appropriate fields.
	 *
	 *  @return {Object} Serializable JSON object.
	 *  @internal
	 *  @method atIfy
	 */
	atIfy() {
		return this.atIfyObject(this);
	}
	atIfyArray(o) {
		let a = [];
		for (let i = 0; i < o.length; i++) {
			if (EcObject.isObject(o[i])) {
				if (o[i] instanceof EcLinkedData) 
					a[i] = this.atIfyObject(o[i]);
				else 
					a[i] = o[i];
			} else if (EcArray.isArray(o[i])) 
				a[i] = this.atIfyArray(o[i]);
			else 
				a[i] = o[i];
		}
		return a;
	}
	atIfyObject(o) {
		let keys = [];
		let me = o;
		for (let key in me) {
			if (me["type"] != null && EcLinkedData.isAtProperty(key)) 
				key = "@" + key; //NOSONAR -- Reassignment of non-const variable is intended.
			keys.push(key);
		}
		keys.sort((a, b) => a.localeCompare(b));
		let op = {};
		for (let key of keys) {
			let value = me[key.replace("@", "")];
			if (value != null && value instanceof EcLinkedData) 
				value = value.atIfy();
			else if (EcArray.isArray(value)) 
				value = this.atIfyArray(value);
			if (value != null) 
				op[key] = value;
			else 
				value = me[key];
			if (value != null) 
				op[key] = value;
		}
		return op;
	}
	/**
	 *  Uses the object's fully qualified type name and compares it to the
	 *  provided type.
	 *
	 *  @param {string} type Fully qualified type name uri.
	 *  @return {boolean} True if match, False if not.
	 *  @method isA
	 */
	isA(type) {
		let computedType = this.getFullType();
		return computedType.equals(type) || this.type.equals(type);
	}
	/**
	 *  Uses the object's fully qualified type name and compares it to the
	 *  provided type.
	 *
	 *  @param {string[]} type Fully qualified type name uris.
	 *  @return {boolean} True if match, False if not.
	 *  @method isAny
	 */
	isAny(types) {
		let computedType = this.getFullType();
		if (types.length == 0) return true;
		for (let type of types)
			if (type == computedType || type == this.type)
				return true;
		return false;
	}
	/**
	 *  Gets the fully qualified type name, as JSON-LD allows the "namespace" of
	 *  the type to be defined in @context.
	 *
	 *  @return {string} Fully qualified type name.
	 *  @method getFullType
	 */
	getFullType() {
		if (this.context == null) return this.type;
		if (this.type.indexOf("http") != -1) return this.type;
		let computedType = this.context;
		if (EcObject.isObject(this.context)) {
			let typeParts = this.type.split(":");
			if (typeParts.length == 2) {
				computedType = this.context[typeParts[0]];
				if (!computedType.endsWith("/")) computedType += "/";
				computedType += typeParts[1];
				return computedType;
			} else if (this.context["@vocab"] != null)
				computedType = this.context["@vocab"];
		}
		if (!computedType.endsWith("/")) computedType += "/";
		computedType += this.type;
		return computedType;
	}
	/**
	 *  Also could be called "upcast", for those in the know.
	 *  <p>
	 *  A method of copying properties from some other object. As freshly
	 *  deserialized javascript objects do not inherently attach the functions of
	 *  their type, it is this or factory hell.
	 *
	 *  @param that The freshly deserialized object, or the object to upcast into this object.
	 *  @method copyFrom
	 */
	copyFrom(that, eim) {
		for (let key in this) {
			if (typeof this[key] == "function")
				continue;
			delete this[key];
		}
		for (let key in that) {
			if (typeof that[key] == "function") 
				continue;
			if (that["@type"] != null) 
				this[key.replace("@", "")] = that[key];
			else 
				this[key] = that[key];
		}
		this.swapContext();
		this.upgrade(eim);
		if (!this.isAny(this.getTypes()))
			throw new Error("Incompatible type: " + this.getFullType() + that);
		return this;
	}
	swapContext() {
		let stripNamespace = null;
		let newContext = null;
		if (
			this.type != null &&
			this.context != null &&
			EcObject.isObject(this.context)
		) {
			let typeParts = this.type.split(":");
			if (typeParts.length == 2) {
				newContext = this.context[typeParts[0]];
				stripNamespace = typeParts[0];
				if (!newContext.endsWith("/"))
					newContext += "/";
			} else if (this.context["@vocab"] != null)
				newContext = this.context["@vocab"];
		}
		if (stripNamespace != null)
			this.stripNamespace();
		if (newContext != null)
			this.context = newContext;
	}
	stripNamespace() {
		for (let key in this) {
			if (typeof this[key] != "function" && key.startsWith(stripNamespace + ":")) {
				if (EcArray.isArray(this[key]) || EcObject.isObject(this[key])) {
					this[key.replace(stripNamespace + ":", "")] = JSON.parse(
						JSON.stringify(this[key]).replace(
							stripNamespace + ":",
							""
						)
					);
				} else
					this[key.replace(stripNamespace + ":", "")] = this[key];
				delete this[key];
			}
		}
	}
	async recast(translationContext, targetContext, documentLoader) {
		let me = this;
		let json = JSON.parse(this.toJson());
		if (targetContext == null) targetContext = json["@context"];
		json["@context"] = translationContext;
		let finalTargetContext = targetContext;
		let docLoader;
		if (documentLoader)
			docLoader = {documentLoader: documentLoader}
		let actual;
		try {
			actual = await jsonld.expand(json, docLoader);
		} catch(error) {
			if (error != null) {
				global.auditLogger.report(global.auditLogger.LogCategory.SYSTEM, global.auditLogger.Severity.ERROR, "EcLinkedDataRecast", error["message"]);
				return;
			}
		}
		let o;
		try {
			o = await jsonld.compact(actual, finalTargetContext, docLoader);
		} catch(s) {
			if (s != null) {
				global.auditLogger.report(global.auditLogger.LogCategory.SYSTEM, global.auditLogger.Severity.ERROR, "EcLinkedDataRecast", s);
				return;
			}
		}
		me.copyFrom(o);
		me["@context"] = finalTargetContext;
		return me;
	}
	/**
	 *  Encodes the object in a form where it is ready to be signed.
	 *  This method is under long term review, and may change from version to version.
	 *
	 *  @return ASCII-sort order encoded space-free and tab-free JSON-LD.
	 *  @method toSignableJson
	 */
	toSignableJson() {
		let d = JSON.parse(this.toJson());
		if (
			this.type.indexOf("http://schema.eduworks.com/") == 0 &&
			this.type.indexOf("/0.1/") != -1
		) {
			delete d["signature"];
			delete d["owner"];
			delete d["reader"];
			delete d["@signature"];
			delete d["@signatureSha256"];
			delete d["@owner"];
			delete d["@reader"];
			delete d["@id"];
		} else {
			delete d["signature"];
			delete d["@signature"];
			delete d["signatureSha256"];
			delete d["@signatureSha256"];
			delete d["@id"];
		}
		let e = new EcLinkedData(d.context, d.type);
		e.copyFrom(d);
		return e.toJson();
	}
	/**
	 *  Upgrades the object to the latest version, performing transforms and the like.
	 *
	 *  @method upgrade
	 */
	upgrade() { } //NOSONAR -- Method is a stub.
	/**
	 *  Removes the @ symbol from properties in order to make them more
	 *  accessible in Javascript.
	 *
	 *  @return {EcLinkedData} This object, with @ properties converted to @-less properties.
	 *  @method deAtify
	 *  @internal
	 */
	deAtify() {
		let typeFound = this["@type"] != null;
		for (let key in this) {
			if (this[key] == null) {
				if (typeFound) {
					let value = this[key];
					if (value != null && value instanceof EcLinkedData)
						value = value.deAtify();
					this[key.replace("@", "")] = value;
				} else if (this?.[key] instanceof EcLinkedData)
					this[key] = this[key].deAtify();
			}
		}
		return this;
	}
	/**
	 *  Gets all versions of JSON-LD type strings for this type of object.
	 *
	 *  @return {string[]} Array of URIs.
	 *  @method getTypes
	 */
	getTypes() {
		let a = [];
		if (this.context != null && this.type != null) {
			if (!EcObject.isObject(this.context)) {
				let context = !this.context.endsWith("/")
					? this.context + "/"
					: this.context;
				if (this.type.indexOf(context) == 0) a.push(this.type);
				else a.push(context + this.type);
			}
		}
		return a;
	}
	async compact(remoteContextUrl, success, failure) {
		let me = this;
		try {
			let compacted = await jsonld.compact(this.toJson(),	remoteContextUrl);
			me.copyFrom(compacted);
			success(this);
		} catch(err) {
			if (err != null) {
				failure(err);
				return;
			}
		}
	}
};
