if (typeof process !== 'undefined' && process.version && process.version.startsWith("v16")) {
	console.log("Loading polyfill for FormData.");
	FormData = eval("require('undici').FormData");
}
const EcObject = require("../../../../com/eduworks/ec/array/EcObject");
const EcEncryptedValue = require("./EcEncryptedValue");
const EcIdentityManager = require("../identity/EcIdentityManager");
const EcRekeyRequest = require("../identity/EcRekeyRequest");
const EcArray = require("../../../../com/eduworks/ec/array/EcArray");
const EcRemote = require("../../../../com/eduworks/ec/remote/EcRemote");
const { cassPromisify, cassReturnAsPromise, cassReturnNullAsPromise } = require("../../../../com/eduworks/ec/promises/helpers");
const EcRemoteLinkedData = require("../../schema/general/EcRemoteLinkedData");
const EcCrypto = require("../../../../com/eduworks/ec/crypto/EcCrypto");
const EcIdentity = require("../identity/EcIdentity");
const EcPpkFacade = require("../../../../com/eduworks/ec/crypto/EcPpkFacade");
const EcPk = require("../../../../com/eduworks/ec/crypto/EcPk");
const EcLinkedData = require("../../../json/ld/EcLinkedData.js");
require("../../general/AuditLogger.js")

/**
 *  Repository object used to interact with the CASS Repository web services.
 *  Should be used for all CRUD and search operations
 *
 *  @author fritz.ray@eduworks.com
 *  @module com.eduworks.ec
 *  @class EcRepository
 */
module.exports = class EcRepository {
	static LONGIDS = "longIds";
	static static() {
		EcRepository.cacheDBHandle = typeof window !== 'undefined' ? window?.indexedDB?.open("EcRepositoryCache", 3) : null;
		if (EcRepository.cacheDBHandle != null) {
			EcRepository.cacheDBHandle.onerror = (event) => {
				console.error(event);
			};
			EcRepository.cacheDBHandle.onsuccess = (event) => {
				EcRepository.cacheDB = event.target.result;
			};
			EcRepository.cacheDBHandle.onupgradeneeded = (event) => {
				console.log(event);
				for (let version = event.oldVersion; version <= event.newVersion; version++) {
					if (version == 3) {
						const objectStore = event.target.result.createObjectStore(EcRepository.LONGIDS, { keyPath: "id" });

						// Use transaction oncomplete to make sure the objectStore creation is
						// finished before adding data into it.
						objectStore.transaction.oncomplete = (event) => {
							EcRepository.cacheDB = event.target.result;
						};
					}
				}
			};
		}
	}
	constructor() {
		this.constructor.repos.push(this);
	}
	static caching = false;
	static cachingL2 = false;
	static cachingSearch = false;
	static unsigned = false;
	static alwaysTryUrl = false;
	static cacheDBHandle = null;
	static cacheDB = null;
	static cacheGet = async (prop, transaction, objectStore) => {
		if (EcArray.isArray(prop)) {
			if (EcRepository.cachingL2 == true && EcRepository.cacheDB != null && transaction == null)
				transaction = EcRepository.cacheDB.transaction(EcRepository.LONGIDS, "readonly");
			if (EcRepository.cachingL2 == true && transaction != null && objectStore == null)
				objectStore = transaction.objectStore(EcRepository.LONGIDS);
			return await Promise.all(prop.map(p => EcRepository.cacheGet(p, transaction, objectStore)));
		}
		if (EcRepository.cachingL2 == false)
			return EcRepository.cache[prop];
		if (EcRepository.cacheDB == null)
			return EcRepository.cache[prop];
		if (EcRemoteLinkedData.trimVersionFromUrl(prop) == prop)
			return EcRepository.cache[prop];
		if (EcRepository.cache[prop] != null)
			return EcRepository.cache[prop];
		return new Promise(function (resolve, reject) {
			if (transaction == null)
				transaction = EcRepository.cacheDB.transaction(EcRepository.LONGIDS, "readonly");
			if (objectStore == null)
				objectStore = transaction.objectStore(EcRepository.LONGIDS);
			const request = objectStore.get(prop);
			request.onerror = function (event) {
				resolve(EcRepository.cache[prop]);
			};
			request.onsuccess = function (event) {
				if (request.result != null)
					resolve(new EcRemoteLinkedData().copyFrom(request.result));
				else
					resolve(EcRepository.cache[prop]);
			};
		})
	}
	static cacheBacking = {};
	static cache = new Proxy(EcRepository.cacheBacking, {
		get: function (target, prop) {
			return Reflect.get(...arguments);
		},
		set: function (target, prop, value) {
			if (EcRepository.cachingL2 == false)
				return Reflect.set(...arguments);
			if (EcRepository.cacheDB == null)
				return Reflect.set(...arguments);
			if (EcRemoteLinkedData.trimVersionFromUrl(prop) == prop)
				return Reflect.set(...arguments);
			const transaction = EcRepository.cacheDB.transaction(EcRepository.LONGIDS, "readwrite");
			const objectStore = transaction.objectStore(EcRepository.LONGIDS);
			if (value instanceof EcRemoteLinkedData) {
				let o = JSON.parse(value.toJson());
				for (let prop of EcLinkedData.atProperties)
					if (o[prop] == null)
						o[prop] = o['@' + prop];
				objectStore.add(o);
			}
			if (value == null) {
				objectStore.delete(prop);
			}
			return Reflect.set(...arguments);
		},
		deleteProperty: function (target, prop) {
			if (EcRepository.cachingL2 == false)
				return Reflect.deleteProperty(...arguments);
			if (EcRepository.cacheDB == null)
				return Reflect.deleteProperty(...arguments);
			if (EcRemoteLinkedData.trimVersionFromUrl(prop) == prop)
				return Reflect.deleteProperty(...arguments);
			const transaction = EcRepository.cacheDB.transaction(EcRepository.LONGIDS, "readwrite");
			const objectStore = transaction.objectStore(EcRepository.LONGIDS);
			objectStore.delete(prop);
			return Reflect.deleteProperty(...arguments);
		}
	});
	static fetching = {};
	static repos = [];
	static defaultPlugins = [];
	adminKeys = null;
	selectedServer = null;
	selectedServerProxy = null;
	autoDetectFound = false;
	signatureSheetHashAlgorithm = "SHA-1";
	timeOffset = 0;
	postMaxSize = null;
	init(selectedServer, success, failure, loginObjectCallback) {
		this.selectedServer = selectedServer;
		return this.negotiateTimeOffset(success, failure, loginObjectCallback);
	}
	negotiateTimeOffset = function (success, failure, loginObjectCallback) {
		let oldTimeout = EcRemote.timeout;
		EcRemote.timeout = 500;
		let me = this;
		let successCheck = function (p1) {
			if (p1 != null) {
				if (p1.ssoPublicKey != null) {
					let identity = new EcIdentity();
					identity.displayName = "SSO Identity";
					identity.ppk = new EcPpkFacade(EcPk.fromPem(p1.ssoPublicKey));
					EcIdentityManager.default.addIdentity(identity);
				}
				if (p1["plugins"]) {
					EcRepository.defaultPlugins = JSON.parse(p1["plugins"]);
				}
				if (p1["postMaxSize"]) {
					me.postMaxSize = p1["postMaxSize"];
				}
				if (p1["signatureSheetHashAlgorithm"]) {
					me.signatureSheetHashAlgorithm = p1["signatureSheetHashAlgorithm"];
				}
				if (p1["ping"] == "pong") {
					if (loginObjectCallback != null)
						loginObjectCallback(p1);
					if (p1["time"] != null)
						me.timeOffset = p1["time"] - new Date().getTime();
					return me.buildKeyForwardingTable(success, failure);
				}
			}
		};
		EcRemote.timeout = oldTimeout;
		return EcRemote.getExpectingObject(this.selectedServer, "ping")
			.then(successCheck)
			.catch((error) => {
				global.auditLogger.report(global.auditLogger.LogCategory.SYSTEM, global.auditLogger.Severity.ERROR, "EcRepoTimeOffset", error);
				if (failure != null)
					failure(error);
			});
	};
	buildKeyForwardingTable = function (success, failure, eim) {
		let params = { size: 10000 };
		return cassPromisify(
			EcRepository.searchAs(
				this,
				"*",
				() => new EcRekeyRequest(),
				null,
				null,
				params, eim
			).then(async (rekeyRequests) => {
				for (let i = 0; i < rekeyRequests.length; i++) {
					await rekeyRequests[i].addRekeyRequestToForwardingTable();
				}
				global.auditLogger.report(global.auditLogger.LogCategory.SYSTEM, global.auditLogger.Severity.INFO, "EcRepoBuildKeyForwTable", EcObject.keys(EcRemoteLinkedData.forwardingTable).length + " records now in forwarding table.");
			}),
			success,
			failure
		);
	};
	static history(url, repo, eim) {
		if (url == null) {
			throw new Error("URL is null. Cannot EcRepository.history");
		}
		if (url.toLowerCase().indexOf("http") != 0) {
			throw new Error("URL does not begin with http. Cannot EcRepository.history");
		}
		if (eim == null)
			eim = EcIdentityManager.default;
		if (repo != null) {
			url = EcRemoteLinkedData.veryShortId(
				repo.selectedServer,
				EcCrypto.md5(url)
			);
		} else if (this.repos.length == 1) {
			url = EcRemoteLinkedData.veryShortId(
				this.repos[0].selectedServer,
				EcCrypto.md5(url)
			);
		}

		let finalUrl = url + "?history=true";
		let p = null;
		if (this.unsigned) {
			p = EcRemote.getExpectingObject(finalUrl);
		} else {
			let offset = this.setOffset(url);
			p = eim.signatureSheet(300000 + offset, url, null, null, repo != null ? repo.signatureSheetHashAlgorithm : null).then(
				(signatureSheet) => {
					let fd = new FormData();
					fd.append("signatureSheet", signatureSheet);
					return EcRemote.postExpectingObject(finalUrl, null, fd);
				}
			);
		}
		p = p.then((data) => {
			return data.map(d => { let rld = new EcRemoteLinkedData(); rld.copyFrom(d); return rld; });
		}).catch((error) => {
			if (
				error != null &&
				error.toString != undefined
			) {
				if (error.toString().indexOf("Could not locate object. May be due to EcRepository.alwaysTryUrl flag.") != -1) {
					return null;
				}
				if (error.toString().indexOf("Object not found or you did not supply sufficient permissions to access the object.") != -1) {
					return null;
				}
			}
			throw error;
		});
		return p;
	}
	/**
	 *  Gets a JSON-LD object from the place designated by the URI.
	 *  <p>
	 *  Uses a signature sheet gathered from {@link EcIdentityManager}.
	 *
	 *  @param {String}                               url URL of the remote object.
	 *  @param {Callback1<EcRemoteLinkedData>}success Event to call upon
	 *                                                successful retrieval.
	 *  @param {Callback1<String>}                    failure Event to call upon spectacular
	 *                                                failure.
	 *  @memberOf EcRepository
	 *  @method get
	 *  @static
	 */
	static async get(url, success, failure, repo, eim) {
		if (url == null) {
			throw new Error("URL is null. Cannot EcRepository.get");
		}
		if (url.toLowerCase().indexOf("http") != 0) {
			throw new Error("URL does not begin with http. Cannot EcRepository.get " + url);
		}

		if (eim === undefined || eim == null)
			eim = EcIdentityManager.default;
		if (EcRepository.fetching[url + eim.eimId] != null) {
			return cassPromisify(EcRepository.fetching[url + eim.eimId], success, failure);
		}
		let originalUrl = url;
		if (EcRepository.caching) {
			let cached = await EcRepository.cacheGet(url);
			if (cached !== undefined) {
				if (cached === null) {
					return cassReturnNullAsPromise(
						success,
						failure
					);
				} else {
					return cassReturnAsPromise(
						cached,
						success,
						failure
					);
				}
			}
		}
		let version = EcRemoteLinkedData.getVersionFromUrl(url);
		let trimmedUrl = EcRemoteLinkedData.trimVersionFromUrl(url);

		if (!this.shouldTryUrl(url)) {
			if (this.repos.length == 1) {
				if (!url.startsWith(this.repos[0].selectedServer))
					url = EcRemoteLinkedData.veryShortId(
						this.repos[0].selectedServer,
						EcCrypto.md5(trimmedUrl),
						version
					)
			} else if (repo !== undefined && repo !== null) {
				if (!url.startsWith(repo.selectedServer))
					url = EcRemoteLinkedData.veryShortId(
						repo.selectedServer,
						EcCrypto.md5(trimmedUrl),
						version
					);
			} else {
				return this.find(
					url,
					"Could not locate object. May be due to EcRepository.alwaysTryUrl flag.",
					{},
					0,
					success,
					failure, eim
				).catch((error) => {
					if (
						error !== undefined &&
						error != null &&
						error.toString !== undefined
					)
						if (error.toString().indexOf("Could not locate object. May be due to EcRepository.alwaysTryUrl flag.") != -1) {
							return null;
						}
					if (error.toString().indexOf("Object not found or you did not supply sufficient permissions to access the object.") != -1) {
						return null;
					}
					throw error;
				});
			}
		}
		if (EcRepository.caching) {
			let cached = await EcRepository.cacheGet(url);
			if (cached !== undefined) {
				if (cached === null) {
					return cassReturnNullAsPromise(
						success,
						failure
					);
				} else {
					return cassReturnAsPromise(
						cached,
						success,
						failure
					);
				}
			}
		}
		let finalUrl = url;
		let p = null;
		if (this.unsigned) {
			p = EcRemote.getExpectingObject(finalUrl);
		} else {
			let offset = this.setOffset(url);
			p = eim.signatureSheet(300000 + offset, url, null, null, repo != null ? repo.signatureSheetHashAlgorithm : null).then(
				(signatureSheet) => {
					let fd = new FormData();
					fd.append("signatureSheet", signatureSheet);
					return EcRemote.postExpectingObject(finalUrl, null, fd);
				}
			);
		}
		p = p.then((data) => {
			return this.getHandleData(
				data,
				originalUrl,
				success,
				failure,
				finalUrl
			);
		}).catch((error) => {
			if (repo === undefined || repo == null) {
				return this.find(
					originalUrl,
					error,
					{},
					0,
					success,
					failure, eim
				).catch((error) => {
					if (
						error !== undefined &&
						error != null &&
						error.toString !== undefined
					)
						if (error.toString().indexOf("Could not locate object. May be due to EcRepository.alwaysTryUrl flag.") != -1) {
							return null;
						}
					if (error.toString().indexOf("Object not found or you did not supply sufficient permissions to access the object.") != -1) {
						return null;
					}
					throw error;
				});
			} else {
				if (this.caching) this.cache[url] = null;
				return cassReturnAsPromise(null, success, failure, error).catch((error) => {
					if (
						error !== undefined &&
						error != null &&
						error.toString !== undefined
					)
						if (error.toString().indexOf("Could not locate object. May be due to EcRepository.alwaysTryUrl flag.") != -1)
							return null;
					if (error.toString().indexOf("Object not found or you did not supply sufficient permissions to access the object.") != -1)
						return null;
					throw error;
				});
			}
		}).finally(
			(result) => {
				delete EcRepository.fetching[originalUrl + eim.eimId];
				return result;
			}
		);
		EcRepository.fetching[originalUrl + eim.eimId] = p;
		return p;
	}
	static setOffset = function (url) {
		let offset = 0;
		for (let i = 0; i < this.repos.length; i++) {
			if (url.indexOf(this.repos[i].selectedServer) != -1) {
				offset = this.repos[i].timeOffset;
			}
		}
		return offset;
	};
	static getHandleData = function (
		p1,
		originalUrl,
		success,
		failure,
		finalUrl
	) {
		let d = new EcRemoteLinkedData("", "");
		let defaultFunc = (result) => {
			if (result === undefined || result == null) {
				if (p1 !== undefined && p1 !== null && EcObject.isObject(p1))
					return d;
				else return null;
			}
			return result;
		};
		if (!EcObject.isObject(p1)) {
			if (this.caching) this.cache[finalUrl] = null;
			return cassReturnAsPromise(null, success, failure).then(
				defaultFunc
			);
		}
		d.copyFrom(p1);
		if (d.getFullType() == null) {
			return this.find(
				originalUrl,
				JSON.stringify(p1),
				{},
				0,
				success,
				failure, eim
			);
		}
		if (this.caching) {
			this.cache[finalUrl] = d;
			if (originalUrl != null && originalUrl != finalUrl)
				this.cache[originalUrl] = d;
			if (d.id != null) this.cache[d.id] = d;
		}
		return cassReturnAsPromise(d, success, failure).then(defaultFunc);
	};
	static shouldTryUrl = function (url) {
		if (url == null) return false;
		if (this.alwaysTryUrl) return true;
		if (this.repos.length == 0) return true;
		let validUrlFound = false;
		for (let i = 0; i < this.repos.length; i++) {
			if (this.repos[i].selectedServer == null) continue;
			validUrlFound = true;
		}
		if (!validUrlFound) return true;
		return false;
	};
	static find(url, error, history, counter, success, failure, eim) {
		if (
			isNaN(counter) ||
			counter == undefined ||
			counter > this.repos.length ||
			this.repos[counter] == null
		) {
			delete this.fetching[url];
			if (this.caching) this.cache[url] = null;
			return cassReturnAsPromise(null, success, failure, error);
		}
		let repo = this.repos[counter];
		if (repo.selectedServer == null) {
			return this.find(
				url,
				error,
				history,
				counter + 1,
				success,
				failure, eim
			);
		}
		if (history[repo.selectedServer] == true) {
			return this.find(
				url,
				error,
				history,
				counter + 1,
				success,
				failure, eim
			);
		}
		history[repo.selectedServer] = true;
		let p = repo.search('@id:"' + url + '"', null, null, null, eim);
		p = p
			.then((strings) => {
				if (strings == null || strings.length == 0)
					return this.find(
						url,
						error,
						history,
						counter + 1,
						success,
						failure, eim
					);
				else {
					let done = false;
					for (let i = 0; i < strings.length; i++) {
						if (
							strings[i].id == url ||
							strings[i].shortId() == url
						) {
							if (done)
								log(
									"Searching for exact ID:" +
									url +
									", found more than one@:" +
									repo.selectedServer
								);
							done = true;
							delete EcRepository.fetching[url];
							if (EcRepository.caching) {
								EcRepository.cache[url] = strings[i];
							}
							return cassReturnAsPromise(
								strings[i],
								success,
								failure
							);
						}
					}
					if (done)
						return cassReturnAsPromise(
							null,
							success,
							failure,
							error
						);
					return this.find(
						url,
						error,
						history,
						counter + 1,
						success,
						failure, eim
					);
				}
			})
			.catch((s) => {
				return this.find(
					url,
					s,
					history,
					counter + 1,
					success,
					failure, eim
				);
			});
		return p;
	}
	/**
	 *  Escapes a search query
	 *
	 *  @param {String} query Query string to escape
	 *  @return {String} Escaped query string
	 *  @memberOf EcRepository
	 *  @method escapeSearch
	 *  @static
	 */
	static escapeSearch = function (query) {
		let s = null;
		s = query.split("\\").join("\\\\");
		s = s.split("-").join("\\-");
		s = s.split("=").join("\\=");
		s = s.split("&&").join("\\&&");
		s = s.split("||").join("\\||");
		s = s.split("<").join("\\<");
		s = s.split(">").join("\\>");
		s = s.split("|").join("\\|");
		s = s.split("(").join("\\(");
		s = s.split(")").join("\\)");
		s = s.split("{").join("\\{");
		s = s.split("}").join("\\}");
		s = s.split("[").join("\\[");
		s = s.split("]").join("\\]");
		s = s.split("^").join("\\^");
		s = s.split('"').join('\\"');
		s = s.split("~").join("\\~");
		s = s.split("*").join("\\*");
		s = s.split("?").join("\\?");
		s = s.split(":").join("\\:");
		s = s.split("/").join("\\/");
		s = s.split("+").join("\\+");
		return s;
	};
	/**
	 *  Attempts to save a piece of data.
	 *  <p>
	 *  Uses a signature sheet informed by the owner field of the data.
	 *
	 *  @param {EcRemoteLinkedData} data Data to save to the location designated
	 *                              by its id.
	 *  @param {Callback1<String>}  success Callback triggered on successful save
	 *  @param {Callback1<String>}  failure Callback triggered if error during
	 *                              save
	 *  @memberOf EcRepository
	 *  @method save
	 *  @static
	 */
	static save = function (data, success, failure, repo, eim) {
		return this._save(data, success, failure, repo, eim);
	};
	/**
	 *  Attempts to save a piece of data. If the @id of the data is not of this server, will register the data to the server.
	 *  <p>
	 *  Uses a signature sheet informed by the owner field of the data.
	 *
	 *  @param {EcRemoteLinkedData} data Data to save to the location designated
	 *                              by its id.
	 *  @param {Callback1<String>}  success Callback triggered on successful save
	 *  @param {Callback1<String>}  failure Callback triggered if error during
	 *                              save
	 *  @memberOf EcRepository
	 *  @method save
	 *  @static
	 */
	saveTo = function (data, success, failure, eim) {
		return EcRepository._save(data, success, failure, this, eim);
	};
	/**
	 *  Attempts to save a piece of data. Does some checks before saving to
	*  ensure the data is valid. This version does not send a console warning,
	 *  <p>
	 *  Uses a signature sheet informed by the owner field of the data.
	 *
	 *  @param {EcRemoteLinkedData} data Data to save to the location designated
	 *                              by its id.
	 *  @param {Callback1<String>}  success Callback triggered on successful save
	 *  @param {Callback1<String>}  failure Callback triggered if error during
	 *                              save
	 *  @memberOf EcRepository
	 *  @method _save
	 *  @static
	 */
	static _save = function (data, success, failure, repo, eim) {
		if (data.invalid()) {
			let msg = "Cannot save data. It is missing a vital component.";
			throw msg;
		}
		if (data.reader != null && data.reader.length == 0) {
			delete data["reader"];
		}
		if (data.owner != null && data.owner.length == 0) {
			delete data["owner"];
		}
		if (eim === undefined || eim == null)
			eim = EcIdentityManager.default;
		if (
			(EcEncryptedValue.encryptOnSave(data.id, null) || EcEncryptedValue.encryptOnSave(data.shortId(), null)) &&
			!data.isAny(new EcEncryptedValue().getTypes())
		) {
			return EcEncryptedValue.toEncryptedValue(data, false)
				.then((encryptedValue) => {
					return eim.sign(encryptedValue);
				})
				.then((signedEncryptedValue) => {
					return this._saveWithoutSigning(
						signedEncryptedValue,
						success,
						failure,
						repo,
						eim
					);
				});
		} else {
			return eim.sign(data).then((signedData) => {
				return this._saveWithoutSigning(
					signedData,
					success,
					failure,
					repo,
					eim
				);
			});
		}
	};
	/**
	 *  Attempts to save a piece of data without signing it.
	 *  <p>
	 *  Uses a signature sheet informed by the owner field of the data.
	 *
	 *  @param {EcRemoteLinkedData} data Data to save to the location designated
	 *                              by its id.
	 *  @param {Callback1<String>}  success Callback triggered on successful save
	 *  @param {Callback1<String>}  failure Callback triggered if error during
	 *                              save
	 *  @memberOf EcRepository
	 *  @method _saveWithoutSigning
	 *  @static
	 */
	static _saveWithoutSigning = function (data, success, failure, repo, eim) {
		if (eim === undefined || eim == null)
			eim = EcIdentityManager.default;
		if (repo === undefined) {
			repo = null;
		}
		if (this.caching) {
			delete this.cache[data.id];
			delete this.cache[data.shortId()];
			if (repo != null)
			{
				delete this.cache[
					EcRemoteLinkedData.veryShortId(
						repo.selectedServer,
						data.getGuid()
					)
				];
				delete this.cache[
					EcRemoteLinkedData.veryShortId(
						repo.selectedServer,
						EcCrypto.md5(data.shortId())
					)
				];
			}
		}
		if (data.invalid()) {
			if (failure != null) failure("Data is malformed.");
			else throw "Data is malformed.";
		}
		// Update timestamp if it is an object that originated on a CaSS instance.
		if (
			this.alwaysTryUrl ||
			repo == null ||
			this.shouldTryUrl(data.id) ||
			data.id.indexOf("/api/data/") != -1 ||
			repo != null && data.id.indexOf(repo.selectedServer.replace(/https?/, "")) != -1
		)
			data.updateTimestamp();

		let p = null;

		let offset = 0;
		if (repo == null) {
			offset = this.setOffset(data.id);
		} else {
			offset = repo.timeOffset;
		}
		if (data.owner != null && data.owner.length > 0) {
			p = eim.signatureSheetFor(
				data.owner,
				300000 + offset,
				data.id,
				null, null, repo != null ? repo.signatureSheetHashAlgorithm : null
			);
		} else {
			p = eim.signatureSheet(300000 + offset, data.id, null, null, repo != null ? repo.signatureSheetHashAlgorithm : null);
		}
		p = p.then((signatureSheet) => {
			let fd = new FormData();
			fd.append("data", data.toJson());
			fd.append("signatureSheet", signatureSheet);
			if (!this.alwaysTryUrl) {
				if (repo != null) {
					if (data.id.indexOf(repo.selectedServer) != -1) {
						return EcRemote.postExpectingString(
							data.id,
							"",
							fd,
							success,
							failure
						);
					}
					if (
						!this.shouldTryUrl(data.id) ||
						data.id.indexOf(repo.selectedServer) == -1
					) {
						return EcRemote.postExpectingString(
							EcRemote.urlAppend(
								repo.selectedServer,
								"data/" +
								data.getDottedType() +
								"/" +
								EcCrypto.md5(data.shortId())
							),
							"",
							fd,
							success,
							failure
						);
					}
				}
			}
			return EcRemote.postExpectingString(
				data.id,
				"",
				fd,
				success,
				failure
			);
		});
		return p;
	};
	/**
	 *  Attempts to delete a piece of data.
	 *  <p>
	 *  Uses a signature sheet informed by the owner field of the data.
	 *
	 *  @param {EcRemoteLinkedData} data Data to save to the location designated
	 *                              by its id.
	 *  @param {Callback1<String>}  success Callback triggered on successful
	 *                              delete
	 *  @param {Callback1<String>}  failure Callback triggered if error during
	 *                              delete
	 *  @memberOf EcRepository
	 *  @method _delete
	 *  @static
	 */
	static _delete = function (data, success, failure, repo, eim) {
		return this.DELETE(data, success, failure, repo, eim);
	};
	/**
	 *  Attempts to delete a piece of data.
	 *  <p>
	 *  Uses a signature sheet informed by the owner field of the data.
	 *
	 *  @param {EcRemoteLinkedData} data Data to save to the location designated
	 *                              by its id.
	 *  @param {Callback1<String>}  success Callback triggered on successful
	 *                              delete
	 *  @param {Callback1<String>}  failure Callback triggered if error during
	 *                              delete
	 *  @memberOf EcRepository
	 *  @method DELETE
	 *  @static
	 */
	static DELETE = function (data, success, failure, repo, eim) {
		if (repo !== undefined && repo != null)
			return repo.deleteRegistered(data, success, failure, eim);
		if (eim === undefined || eim == null)
			eim = EcIdentityManager.default;
		if (this.caching) {
			delete this.cache[data.id];
			delete this.cache[data.shortId()];
		}
		let targetUrl;
		targetUrl = data.shortId();
		let offset = this.setOffset(data.id);
		if (data.owner != null && data.owner.length > 0) {
			return eim.signatureSheetFor(
				data.owner,
				300000 + offset,
				data.id,
				null, null, repo != null ? repo.signatureSheetHashAlgorithm : null
			).then((signatureSheet) => {
				return EcRemote._delete(
					targetUrl,
					signatureSheet,
					success,
					failure
				);
			});
		} else {
			return EcRemote._delete(targetUrl, [], success, failure);
		}
	};
	/**
	 *  Attempts to delete a piece of data.
	 *  <p>
	 *  Uses a signature sheet informed by the owner field of the data.
	 *
	 *  @param {EcRemoteLinkedData} data Data to save to the location designated
	 *                              by its id.
	 *  @param {Callback1<String>}  success Callback triggered on successful
	 *                              delete
	 *  @param {Callback1<String>}  failure Callback triggered if error during
	 *                              delete
	 *  @memberOf EcRepository
	 *  @method DELETE
	 *  @static
	 */
	deleteRegistered = function (data, success, failure, eim) {
		if (eim === undefined || eim == null)
			eim = EcIdentityManager.default;
		if (this.caching) {
			delete this.cache[data.id];
			delete this.cache[data.shortId()];
			delete this.cache[
				EcRemoteLinkedData.veryShortId(
					this.selectedServer,
					data.getGuid()
				)
			];
			delete this.cache[
				EcRemoteLinkedData.veryShortId(
					this.selectedServer,
					EcCrypto.md5(data.shortId())
				)
			];
		}
		let targetUrl;
		if (
			EcRepository.shouldTryUrl(data.id) ||
			data.id.indexOf(this.selectedServerProxy != null ? this.selectedServerProxy : this.selectedServer) != -1
		)
			targetUrl = EcRemote.urlAppend(
				this.selectedServer,
				"data/" + data.getDottedType() + "/" + data.getGuid()
			);
		else
			targetUrl = EcRemote.urlAppend(
				this.selectedServer,
				"data/" +
				data.getDottedType() +
				"/" +
				EcCrypto.md5(data.shortId())
			);
		let offset = EcRepository.setOffset(data.id);
		if (data.owner != null && data.owner.length > 0) {
			return eim.signatureSheetFor(
				data.owner,
				300000 + offset,
				data.id,
				null, null, this != null ? this.signatureSheetHashAlgorithm : null
			).then((signatureSheet) => {
				return EcRemote._delete(
					targetUrl,
					signatureSheet,
					success,
					failure
				);
			});
		} else {
			return EcRemote._delete(targetUrl, [], success, failure);
		}
	};
	/**
	 *  Attempts to save many pieces of data. Does some checks before saving to
	 *  ensure the data is valid. This version does not send a console warning,
	 *  <p>
	 *  Uses a signature sheet informed by the owner field of the data.
	 *
	 *  @param {Array<EcRemoteLinkedData>} data Data to save to the location designated
	 *                                     by its id.
	 *  @param {Callback1<String>}         success Callback triggered on successful save
	 *  @param {Callback1<String>}         failure Callback triggered if error during
	 *                                     save
	 *  @memberOf EcRepository
	 *  @method multiput
	 *  @static
	 */
	multiput = function (data, success, failure, eim) {
		if (eim === undefined || eim == null)
			eim = EcIdentityManager.default;
		let allOwners = [];
		for (let d of data) {
			if (d.invalid())
				throw new Error("Cannot save data. It is missing a vital component.");
			if (d.reader != null && d.reader.length == 0) {
				delete d["reader"];
			}
			if (d.owner != null && d.owner.length == 0) {
				delete d["owner"];
			}
			if (
				EcRepository.alwaysTryUrl ||
				EcRepository.shouldTryUrl(d.id) ||
				d.id.indexOf("/api/data/") != -1 ||
				d.id.indexOf(this.selectedServer.replace(/https?/, "")) != -1
			)
				d.updateTimestamp();
			if (EcRepository.caching) {
				delete EcRepository.cache[d.id];
				delete EcRepository.cache[d.shortId()];
				delete EcRepository.cache[
					EcRemoteLinkedData.veryShortId(
						this.selectedServer,
						d.getGuid()
					)
				];
				delete EcRepository.cache[
					EcRemoteLinkedData.veryShortId(
						this.selectedServer,
						EcCrypto.md5(d.shortId())
					)
				];
			}
			if (d.owner != null)
				for (let j = 0; j < d.owner.length; j++)
					EcArray.setAdd(allOwners, d.owner[j]);
		}
		let encryptionAndSigningPromises = data.map((d) => {
			return cassReturnAsPromise(d)
				.then((unencryptedUnsignedData) => {
					if (
						(EcEncryptedValue.encryptOnSave(unencryptedUnsignedData.id, null) || EcEncryptedValue.encryptOnSave(unencryptedUnsignedData.shortId(), null)) &&
						!unencryptedUnsignedData.isAny(
							new EcEncryptedValue().getTypes()
						)
					)
						return EcEncryptedValue.toEncryptedValue(
							unencryptedUnsignedData,
							false
						);
					return unencryptedUnsignedData;
				})
				.then((unsignedData) => {
					return eim.sign(unsignedData);
				})
				.then((unserializedData) =>
					JSON.parse(unserializedData.toJson())
				);
		});
		let preparedData = [];
		return Promise.all(encryptionAndSigningPromises)
			.then((readyToSendData) => {
				preparedData = readyToSendData;
				if (allOwners != null && allOwners.length > 0) {
					return eim.signatureSheetFor(
						allOwners,
						300000 + this.timeOffset,
						this.selectedServer,
						null, null, this.signatureSheetHashAlgorithm
					);
				} else {
					return eim.signatureSheet(
						300000 + this.timeOffset,
						this.selectedServer, null, null, this.signatureSheetHashAlgorithm
					);
				}
			})
			.then((signatureSheet) => {
				let fd = new FormData();
				let stringifiedData = JSON.stringify(preparedData);
				if (this.postMaxSize && (stringifiedData.length >= this.postMaxSize || signatureSheet.length >= this.postMaxSize) && data.length > 1) {
					let arr1 = data.slice(0, Math.floor(data.length / 2));
					let arr2 = data.slice(Math.floor(data.length / 2), data.length);

					let promise1 = this.multiput(arr1, null, null, eim);
					let promise2 = this.multiput(arr2, null, null, eim);

					let promise = Promise.all([promise1, promise2]);
					return cassPromisify(promise, success, failure);
				} else {
					fd.append("data", stringifiedData);
					fd.append("signatureSheet", signatureSheet);
					let server = this.selectedServer;
					return EcRemote.postExpectingString(
						server,
						"sky/repo/multiPut",
						fd,
						success,
						failure
					);
				}
			});
	};
	/**
	 *  Retrieves data from the server and caches it for use later during the
	 *  application. This should be called before the data is needed if possible,
	 *  so loading displays can be faster.
	 *
	 *  @param {String[]}  urls List of Data ID Urls that should be precached
	 *  @param {Callback0} success Callback triggered once all of the data has
	 *                     been retrieved
	 *  @memberOf EcRepository
	 *  @method precache
	 */
	precache = async function (urls, success, failure, eim, skipIds, versionedUrls) {
		let me = this;
		if (eim === undefined || eim == null)
			eim = EcIdentityManager.default;
		if (urls == null) {
			throw new Error("urls not defined.");
		}
		urls = [...urls];
		let originals = [...urls];
		if (EcRepository.caching == true) {
			for (let i = 0; i < urls.length; i++)
				if (await EcRepository.cacheGet(urls[i]) !== undefined)
					urls.splice(i--, 1);
		}
		let versionedUrlsPassedIn = versionedUrls != null;
		versionedUrls = versionedUrls || {};
		urls = urls.map(
			url => {
				let version = EcRemoteLinkedData.getVersionFromUrl(url);
				if (!versionedUrlsPassedIn && version) {
					versionedUrls[url] = true;
				}
				if (url.startsWith(this.selectedServer))
					return url.replace(this.selectedServer, "").replace("custom/", "");
				// This double slash is intentional to support parsing the versioned url
				return "data//" + EcCrypto.md5(EcRemoteLinkedData.trimVersionFromUrl(url)) + (version != null ? ("/" + version) : "");
			}
		);
		if (EcRepository.caching == true) {
			for (let i = 0; i < urls.length; i++)
				if (await EcRepository.cacheGet(urls[i]) !== undefined)
					urls.splice(i--, 1);
		}
		if (urls.length == 0) {
			return cassPromisify(new Promise((resolve, reject) => {
				resolve(
					EcRepository.cacheGet(originals).then(c => c.filter(x => x))
				)
			}), success, failure);
		}

		let fd = new FormData();
		fd.append("data", JSON.stringify(urls));
		if (EcRepository.cachingL2 && !skipIds) {
			fd.append("ids", "true");
		}
		let p = new Promise((resolve, reject) => resolve());
		if (!EcRepository.unsigned)
			p = p.then(() => {
				return eim.signatureSheet(
					300000 + this.timeOffset,
					this.selectedServer, null, null, this.signatureSheetHashAlgorithm
				).then((signatureSheet) => {
					fd.append("signatureSheet", signatureSheet);
				});
			});
		p = p
			.then(() => {
				return EcRemote.postExpectingObject(
					this.selectedServer,
					"sky/repo/multiGet",
					fd
				);
			})
			.then(async (results) => {
				//If we got an array of strings, multiget it.
				if (results.length > 0 && typeof (results[0]) == 'string') {
					for (let result of results) {
						//If we have something in the L2 cache that we requested using a short ID, we need to put it into the L1 cache.
						if (EcRemoteLinkedData.trimVersionFromUrl(result) == result) continue;
						let cached = await EcRepository.cacheGet(result);
						if (cached != null) {
							let md5Id = EcRemoteLinkedData.veryShortId(
								this.selectedServer,
								EcCrypto.md5(cached.shortId())
							);
							let shortId = cached.shortId();
							let veryShortId = EcRemoteLinkedData.veryShortId(
								this.selectedServer,
								cached.getGuid()
							);
							if (!cached.shortId().startsWith(this.selectedServer))
								EcRepository.cacheBacking[md5Id] = cached;
							EcRepository.cacheBacking[shortId] = cached;
							EcRepository.cacheBacking[veryShortId] = cached;
							EcRepository.cacheBacking[cached.id] = cached;
						}
					}
					let objResults = await me.precache.call(me, results, success, failure, eim, true, versionedUrls);
					if (objResults.length == results.length) 
						return objResults;
					//Second attempt, in case the indexed object URL doesn't match the permanent URL.
					let missingUris = results
						.filter(r => originals.indexOf(r) == -1) //Filter out URLs that were originally longIds.
						.filter(r => !objResults.some(rr => r.indexOf(rr.shortId()) != -1)) //Filter out URLs that were found in the first pass.
						.map(u => EcRemoteLinkedData.trimVersionFromUrl(u)); //NOSONAR - Nesting functions to perform filters is normal.
					if (missingUris.length > 0)
						objResults.push(...await me.precache.call(me, missingUris, null, null, eim, true));
					return objResults;
				} 
				for (let i = 0; i < results.length; i++) {
					let d = new EcRemoteLinkedData(null, null);
					d.copyFrom(results[i]);
					results[i] = d;
					let timestamp = d.getTimestamp();
					let md5Id = EcRemoteLinkedData.veryShortId(
						this.selectedServer,
						EcCrypto.md5(d.shortId())
					);
					let shortId = d.shortId();
					let veryShortId = EcRemoteLinkedData.veryShortId(
						this.selectedServer,
						d.getGuid()
					);
					// Do not cache requested versioned urls as anything other than the versioned url
					if (!versionedUrls[`${md5Id}/${timestamp}`] && !versionedUrls[d.id] && !versionedUrls[`${veryShortId}/${timestamp}`]) {
						if (!d.shortId().startsWith(this.selectedServer))
							EcRepository.cache[md5Id] = d;
						EcRepository.cache[shortId] = d; 
						EcRepository.cache[veryShortId] = d;
					}
					EcRepository.cache[d.id] = d;
				}
				return cassPromisify(new Promise((resolve, reject) => { resolve(Promise.all(originals.map(url => EcRepository.cacheGet(url))).then(c => c.filter(x => x))) }), success, failure);
			});
		return cassPromisify(p, success, failure);
	};
	/**
	 *  Deletes multiple records from the server.
	 *
	 *  @param {String[]}  urls List of Data ID Urls that should be precached
	 *  @param {EcIdentityManager} eim Identity manager to use for signing the request
	 *  @memberOf EcRepository
	 *  @method multidelete
	 */
	multidelete = async function (urls, success, failure, eim) {
		if (urls == null) {
			throw new Error("urls not defined.");
		}
		urls = urls.map(
			url => {
				if (EcObject.isObject(url)) url = url.shortId();
				let version = EcRemoteLinkedData.getVersionFromUrl(url);
				if (url.startsWith(this.selectedServer))
					return url.replace(this.selectedServer, "").replace("custom/", "");
				// This double slash is intentional to support parsing the versioned url
				return "data//" + EcCrypto.md5(EcRemoteLinkedData.trimVersionFromUrl(url)) + (version != null ? ("/" + version) : "");
			}
		);
		let fd = new FormData();
		fd.append("data", JSON.stringify(urls));
		let p = new Promise((resolve, reject) => resolve());
		if (!EcRepository.unsigned)
			p = p.then(() => {
				return (eim || EcIdentityManager.default).signatureSheet(
					300000 + this.timeOffset,
					this.selectedServer, null, null, this.signatureSheetHashAlgorithm
				).then((signatureSheet) => {
					fd.append("signatureSheet", signatureSheet);
				});
			});
		p = p.then(() => EcRemote.postExpectingObject(
					this.selectedServer,
					"sky/repo/multiDelete",
					fd
				)
			);
		return cassPromisify(p, success, failure);
	};
	/**
	 *  Returns an array of JSON-LD objects from the places designated by the given URIs.
	 *  <p>
	 *  Uses a signature sheet gathered from {@link EcIdentityManager}.
	 *
	 *  @param {Array<String>}                        urls URLs of the remote objects.
	 *  @param {Callback1<Array<EcRemoteLinkedData>>} success Event to call upon
	 *                                                successful retrieval.
	 *  @param {Callback1<String>}                    failure Event to call upon spectacular
	 *                                                failure.
	 *  @param {Callback1<Array<EcRemoteLinkedData>>} cachedValues Event to call upon
	 *                                                successful retrieval from cache.
	 *  @memberOf EcRepository
	 *  @method multiget
	 */
	multiget = function (urls, success, failure, eim) {
		let p = this.precache(urls, null, null, eim).then(() =>
			Promise.all(
				urls.map((url) => EcRepository.get(url, null, null, this, eim))
			).then((things) => things.filter((r) => r))
		);
		return cassPromisify(p, success, failure);
	};
	/**
	 *  Search a repository for JSON-LD compatible data.
	 *  <p>
	 *  Uses a signature sheet gathered from {@link EcIdentityManager}.
	 *
	 *  @param {String}                          query ElasticSearch compatible query string, similar to
	 *                                           Google query strings.
	 *  @param {Callback1<EcRemoteLinkedData>}   eachSuccess Success event for each
	 *                                           found object.
	 *  @param {Callback1<EcRemoteLinkedData[]>} success Success event, called
	 *                                           after eachSuccess.
	 *  @param {Callback1<String>}               failure Failure event.
	 *  @memberOf EcRepository
	 *  @method search
	 */
	search(query, eachSuccess, success, failure, eim) {
		return this.searchWithParams(
			query,
			null,
			eachSuccess,
			success,
			failure,
			eim
		);
	}
	/**
	 *  Search a repository for JSON-LD compatible data.
	 *  <p>
	 *  Uses a signature sheet gathered from {@link EcIdentityManager}.
	 *
	 *  @param {String}                          query ElasticSearch compatible query string, similar to
	 *                                           Google query strings.
	 *  @param {Object}                          paramObj Additional parameters that can be used to tailor
	 *                                           the search.
	 *  @param {Callback1<EcRemoteLinkedData>}   eachSuccess Success event for each
	 *                                           found object.
	 *  @param {Callback1<EcRemoteLinkedData[]>} success Success event, called
	 *                                           after eachSuccess.
	 *  @param {Callback1<String>}               failure Failure event.
	 *  @memberOf EcRepository
	 *  @method searchWithParams
	 */
	searchWithParams = async function (
		originalQuery,
		originalParamObj,
		eachSuccess,
		success,
		failure,
		eim
	) {
		let me = this;
		if (eim === undefined || eim == null)
			eim = EcIdentityManager.default;
		let query = originalQuery;
		let paramObj = originalParamObj;
		if (paramObj == null) {
			paramObj = {};
		}
		let params = {};
		let paramProps = params;
		query = this.searchParamProps(query, paramObj, paramProps, eim);
		if (paramObj["fields"] != null) {
			paramProps["fields"] = paramObj["fields"];
		}
		let cacheKey;
		if (EcRepository.cachingSearch) {
			cacheKey = JSON.stringify(paramProps) + query;
			if (EcRepository.cache[cacheKey] != null) {
				let results = EcRepository.cache[cacheKey];
				if (eachSuccess) {
					for (let each of results) {
						eachSuccess(each);
					}
				}
				return cassReturnAsPromise(results, success, failure);
			}
		} else {
			cacheKey = null;
		}
		let fd = new FormData();
		fd.append("data", query);
		if (EcRepository.cachingL2)
			params.ids = true;
		if (params != null) {
			fd.append("searchParams", JSON.stringify(params));
		}
		let p = new Promise((resolve, reject) => {
			resolve();
		});
		if (EcRepository.unsigned == true || paramObj["unsigned"] == true) {
			p = p.then(() => fd.append("signatureSheet", []));
		} else {
			p = p.then(() =>
				eim.signatureSheet(
					300000 + this.timeOffset,
					this.selectedServer, null, null, this.signatureSheetHashAlgorithm
				).then((signatureSheet) => {
					fd.append("signatureSheet", signatureSheet);
				})
			);
		}
		p = p.then(() => {
			return EcRemote.postExpectingObject(
				this.selectedServer,
				"sky/repo/search",
				fd
			).then(async (results) => {
				if (results == null) {
					throw "Error in search. See HTTP request for more details.";
				}
				//If we got an array of strings, multiget it.
				if (results.length > 0 && typeof (results[0]) == 'string')
				{
					let objResults = await me.precache.call(me, results, null, null, eim, true);
					if (eachSuccess) {
						for (let each of objResults) {
							eachSuccess(each);
						}
					}
					if (objResults.length == results.length)
						return objResults;
					//Second attempt, in case the indexed object URL doesn't match the permanent URL.
					let missingUris = results
						.filter(r=>!objResults.some(rr=>r.indexOf(rr.shortId()) != -1))
						.map(u=>EcRemoteLinkedData.trimVersionFromUrl(u)); //NOSONAR - Nesting functions to perform filters is normal.
					if (missingUris.length > 0)
						objResults.push(...await me.precache.call(me,missingUris,null,null,eim,true));
					return objResults;
				} else {
					results = results
						.map((result) => {
							let d = new EcRemoteLinkedData(null, null);
							d.copyFrom(result);
							if (EcRepository.caching) {
								EcRepository.cache[d.shortId()] = EcRepository.cache[d.id] = EcRepository.cache[EcRemoteLinkedData.veryShortId(this.selectedServer, d.getGuid())] = d;
							}
							if (eachSuccess != null) {
								eachSuccess(d);
							}
							return d;
						})
						.filter((n) => n);
					if (EcRepository.cachingSearch) {
						EcRepository.cache[cacheKey] = results;
					}
					return results;
				}
			});
		});
		return cassPromisify(p, success, failure);
	};
	searchParamProps = function (query, paramObj, paramProps, eim) {
		if (eim === undefined || eim == null)
			eim = EcIdentityManager.default;
		if (paramObj["start"] != null) {
			paramProps["start"] = paramObj["start"];
		}
		if (paramObj["size"] != null) {
			paramProps["size"] = paramObj["size"];
		}
		if (paramObj["types"] != null) {
			paramProps["types"] = paramObj["types"];
		}
		if (paramObj["sort"] != null) {
			paramProps["sort"] = paramObj["sort"];
		}
		if (paramObj["track_scores"] != null) {
			paramProps["track_scores"] = paramObj["track_scores"];
		}
		if (paramObj["index_hint"] != null) {
			paramProps["index_hint"] = paramObj["index_hint"];
		}
		if (paramObj["ownership"] != null) {
			let ownership = paramObj["ownership"];
			if (!query.startsWith("(") || !query.endsWith(")")) {
				query = "(" + query + ")";
			}
			if (ownership == "public") {
				query += " AND (_missing_:owner) AND (_missing_:@owner)";
			} else if (ownership == "owned") {
				query += " AND (_exists_:owner OR _exists_:@owner)";
			} else if (ownership == "me") {
				query += " AND (";
				for (let i = 0; i < eim.ids.length; i++) {
					if (i != 0) {
						query += " OR ";
					}
					let id = eim.ids[i];
					query += '\\*owner:"' + id.ppk.toPk().toPem() + '"';
				}
				query += ")";
			}
		}
		return query;
	};
	/**
	 *  Searches known repository endpoints to set the server configuration for
	 *  this repositories instance
	 *
	 *  @memberOf EcRepository
	 *  @method autoDetectRepository
	 */
	autoDetectRepositoryAsync = function (success, failure) {
		let protocols = [];
		if (typeof window !== "undefined")
			if (window != null) {
				if (window.location != null) {
					if (window.location.protocol == "https:") {
						protocols.push("https:");
					}
				}
			}
		if (typeof window !== "undefined")
			if (window != null) {
				if (window.location != null) {
					if (window.location.protocol == "http:") {
						protocols.push("http:");
						protocols.push("https:");
					}
				}
			}
		if (protocols.length == 0) {
			protocols.push("https:");
			protocols.push("http:");
		}
		let hostnames = [];
		let servicePrefixes = [];
		if (this.selectedServer != null) {
			let e = window.document.createElement("a");
			e["href"] = this.selectedServer;
			hostnames.push(e["host"]);
			servicePrefixes.push(e["pathname"]);
		} else {
			if (window.location.host != null) {
				hostnames.push(
					window.location.host,
					window.location.host.replace(".", ".service."),
					window.location.host + ":8080",
					window.location.host.replace(".", ".service.") + ":8080"
				);
			}
			if (window.location.hostname != null) {
				hostnames.push(
					window.location.hostname,
					window.location.hostname.replace(".", ".service."),
					window.location.hostname + ":8080",
					window.location.hostname.replace(".", ".service.") + ":8080"
				);
			}
		}
		EcArray.removeDuplicates(hostnames);
		servicePrefixes.push(
			"/" + window.location.pathname.split("/")[1] + "/api/",
			"/",
			"/service/",
			"/api/"
		);
		EcArray.removeDuplicates(servicePrefixes);
		let me = this;
		me.autoDetectFound = false;
		for (let j = 0; j < hostnames.length; j++) {
			for (let k = 0; k < servicePrefixes.length; k++) {
				for (let i = 0; i < protocols.length; i++) {
					this.autoDetectRepositoryActualAsync(
						protocols[i] +
						"//" +
						hostnames[j] +
						servicePrefixes[k].replace(/\/\//g, "/"),
						success,
						failure
					);
					setTimeout(function () {
						if (me.autoDetectFound == false) {
							let servicePrefixes = [];
							servicePrefixes.push(
								"/" +
								window.location.pathname.split("/")[1] +
								"/api/custom/",
								"/api/custom/"
							);
							EcArray.removeDuplicates(servicePrefixes);
							for (let j = 0; j < hostnames.length; j++) {
								for (
									let k = 0;
									k < servicePrefixes.length;
									k++
								) {
									for (let i = 0; i < protocols.length; i++) {
										me.autoDetectRepositoryActualAsync(
											protocols[i] +
											"//" +
											hostnames[j] +
											servicePrefixes[k].replace(/\/\//g, "/"),
											success,
											failure
										);
										setTimeout(function () {
											if (me.autoDetectFound == false)
												failure(
													"Could not find service."
												);
										}, 5000);
									}
								}
							}
						}
					}, 5000);
				}
			}
		}
	};
	/**
	 *  Searches known repository endpoints to set the server configuration for
	 *  this repositories instance
	 *
	 *  @memberOf EcRepository
	 *  @method autoDetectRepository
	 */
	autoDetectRepository = function () {
		EcRemote.async = false;
		let protocols = [];
		if (typeof window !== "undefined")
			if (window != null) {
				if (window.location != null) {
					if (window.location.protocol == "https:") {
						protocols.push("https:");
					}
				}
			}
		if (typeof window !== "undefined")
			if (window != null) {
				if (window.location != null) {
					if (window.location.protocol == "http:") {
						protocols.push("http:");
						protocols.push("https:");
					}
				}
			}
		if (protocols.length == 0) {
			protocols.push("https:");
			protocols.push("http:");
		}
		let hostnames = [];
		let servicePrefixes = [];
		if (
			this.selectedServer != null &&
			window != null &&
			window.document != null
		) {
			let e = window.document.createElement("a");
			if (e != null) {
				e["href"] = this.selectedServer;
				hostnames.push(e["host"]);
				servicePrefixes.push(e["pathname"]);
			}
		} else if (window != null && window.location != null) {
			if (window.location.host != null) {
				hostnames.push(
					window.location.host,
					window.location.host.replace(".", ".service."),
					window.location.host + ":8080",
					window.location.host.replace(".", ".service.") + ":8080"
				);
			}
			if (window.location.hostname != null) {
				hostnames.push(
					window.location.hostname,
					window.location.hostname.replace(".", ".service."),
					window.location.hostname + ":8080",
					window.location.hostname.replace(".", ".service.") + ":8080"
				);
			}
		}
		if (typeof window !== "undefined")
			if (window != null) {
				if (window.location != null) {
					servicePrefixes.push(
						"/" + window.location.pathname.split("/")[1] + "/api/"
					);
					servicePrefixes.push(
						"/" +
						window.location.pathname.split("/")[1] +
						"/api/custom/"
					);
				}
			}
		if (hostnames.length == 0) {
			hostnames.push("localhost", "localhost:8080");
		}
		servicePrefixes.push("/");
		servicePrefixes.push("/service/");
		servicePrefixes.push("/api/");
		servicePrefixes.push("/api/custom/");
		for (let j = 0; j < hostnames.length; j++) {
			for (let k = 0; k < servicePrefixes.length; k++) {
				for (let i = 0; i < protocols.length; i++) {
					if (
						this.autoDetectRepositoryActual(
							protocols[i] +
							"//" +
							hostnames[j] +
							servicePrefixes[k].replace(/\/\//g, "/")
						)
					) {
						EcRemote.async = true;
						return;
					}
				}
			}
		}
		EcRemote.async = true;
	};
	/**
	 *  Handles the actual detection of repository endpoint /ping service
	 *
	 *  @param {String} guess The server prefix
	 *  @return {boolean} Whether the detection successfully found the endpoint
	 *  @memberOf EcRepository
	 *  @method autoDetectRepositoryAsync
	 *  @private
	 */
	autoDetectRepositoryActualAsync = function (guess, success, failure) {
		let me = this;
		let successCheck = function (p1) {
			if (p1 != null) {
				if (p1["ping"] == "pong") {
					if (p1["time"] != null)
						me.timeOffset = p1["time"] - new Date().getTime();
					if (me.autoDetectFound == false) {
						me.selectedServer = guess;
						me.autoDetectFound = true;
						success();
					}
				}
			}
		};
		let failureCheck = function (p1) {
			if (p1 != null) {
				if (!(p1 == "")) {
					try {
						if (p1.indexOf("pong") != -1) {
							if (me.autoDetectFound == false) {
								me.selectedServer = guess;
								me.autoDetectFound = true;
								success();
							}
						}
					} catch (ex) {
						// eat quietly
					}
				}
			}
		};
		if (guess != null && guess != "") {
			try {
				EcRemote.getExpectingObject(
					guess,
					"ping",
					successCheck,
					failureCheck
				);
			} catch (ex) {
				// eat quietly
			}
		}
		return this.autoDetectFound;
	};
	/**
	 *  Handles the actual detection of repository endpoint /ping service
	 *
	 *  @param {String} guess The server prefix
	 *  @return {boolean} Whether the detection successfully found the endpoint
	 *  @memberOf EcRepository
	 *  @method autoDetectRepositoryActual
	 *  @private
	 */
	autoDetectRepositoryActual = function (guess) {
		let oldTimeout = EcRemote.timeout;
		EcRemote.timeout = 500;
		let me = this;
		let successCheck = function (p1) {
			if (p1 != null) {
				if (p1["ping"] == "pong") {
					if (p1["time"] != null)
						me.timeOffset = p1["time"] - new Date().getTime();
					me.selectedServer = guess;
					me.autoDetectFound = true;
				}
			}
		};
		let failureCheck = function (p1) {
			if (p1 != null) {
				if (p1 != "") {
					try {
						if (p1.indexOf("pong") != -1) {
							me.selectedServer = guess;
							me.autoDetectFound = true;
						}
					} catch (ex) {
						// eat quietly
					}
				}
			}
		};
		if (guess != null && guess != "") {
			try {
				EcRemote.getExpectingObject(
					guess,
					"ping",
					successCheck,
					failureCheck
				);
			} catch (ex) {
				// eat quietly
			}
		}
		EcRemote.timeout = oldTimeout;
		return this.autoDetectFound;
	};
	/**
	 *  Lists all types visible to the current user in the repository
	 *  <p>
	 *  Uses a signature sheet gathered from {@link EcIdentityManager}.
	 *
	 *  @param {Callback1<Object[]>} success Success event
	 *  @param {Callback1<String>}   failure Failure event.
	 *  @memberOf EcRepository
	 *  @method listTypes
	 */
	listTypes = function (success, failure, eim) {
		if (eim === undefined || eim == null)
			eim = EcIdentityManager.default;
		let fd = new FormData();
		fd.append(
			"signatureSheet",
			eim.signatureSheet(
				300000 + this.timeOffset,
				this.selectedServer, null, null, this.signatureSheetHashAlgorithm
			)
		);
		EcRemote.postExpectingObject(
			this.selectedServer,
			"sky/repo/types",
			fd,
			function (p1) {
				let results = p1;
				if (success != null) {
					success(results);
				}
			},
			failure
		);
	};
	/**
	 *  Backs up the skyrepo elasticsearch database to the server backup directory
	 *
	 *  @param {String}            serverSecret Secret string stored on the server to authenticate administrative rights
	 *  @param {Callback1<Object>} success Success event
	 *  @param {Callback1<String>} failure Failure event.
	 *  @memberOf EcRepository
	 *  @method backup
	 */
	backup = function (serverSecret, success, failure) {
		EcRemote.getExpectingObject(
			this.selectedServer,
			"util/backup?secret=" + serverSecret,
			success,
			failure
		);
	};
	/**
	 *  Restores the skyrepo elasticsearch backup from the server backup directory
	 *
	 *  @param {String}            serverSecret Secret string stored on the server to authenticate administrative rights
	 *  @param {Callback1<Object>} success Success event
	 *  @param {Callback1<String>} failure Failure event.
	 *  @memberOf EcRepository
	 *  @method restoreBackup
	 */
	restoreBackup = function (serverSecret, success, failure) {
		EcRemote.getExpectingObject(
			this.selectedServer,
			"util/restore?secret=" + serverSecret,
			success,
			failure
		);
	};
	/**
	 *  Wipes all data from the the skyrepo elasticsearch, can only be restored by using backup restore
	 *
	 *  @param {String}            serverSecret Secret string stored on the server to authenticate administrative rights
	 *  @param {Callback1<Object>} success Success event
	 *  @param {Callback1<String>} failure Failure event.
	 *  @memberOf EcRepository
	 *  @method wipe
	 */
	wipe = function (serverSecret, success, failure) {
		EcRemote.getExpectingObject(
			this.selectedServer,
			"util/purge?secret=" + serverSecret,
			success,
			failure
		);
	};
	/**
	 *  Fetches the admin keys from the server to compare for check if current
	 *  user is an admin user
	 *
	 *  @param {Callback1<String[]>} success
	 *                               Callback triggered when the admin keys are successfully returned,
	 *                               returns an array of the admin public keys
	 *  @param {Callback1<String>}   failure
	 *                               Callback triggered if error occurs fetching admin keys
	 *  @memberOf EcRepository
	 *  @method fetchServerAdminKeys
	 */
	fetchServerAdminKeys = function (success, failure) {
		let service;
		if (this.selectedServer.endsWith("/")) {
			service = "sky/admin";
		} else {
			service = "/sky/admin";
		}
		let me = this;
		EcRemote.getExpectingObject(
			this.selectedServer,
			service,
			function (p1) {
				let ary = p1;
				me.adminKeys = [];
				for (let i = 0; i < ary.length; i++) {
					me.adminKeys.push(ary[i]);
				}
				success(ary);
			},
			function (p1) {
				failure("");
			}
		);
	};
	static getAs(id, result, success, failure, repo, eim) {
		return this.get(id, null, null, repo, eim).then(async (p1) => {
			if (p1 == null) {
				if (failure != null) {
					return failure(null);
				} else {
					return null;
				}
			}
			if (p1.constructor === result.constructor) {
				if (success != null) {
					return success(p1);
				} else
					return p1;
			}
			p1 = await EcEncryptedValue.fromEncryptedValue(
				p1, null, null, eim
			);
			if (p1.isAny(result.getTypes())) {
				result.copyFrom(p1, eim);
				if (this.caching) {
					this.cache[result.shortId()] = result;
					this.cache[result.id] = result;
				}
				if (success != null) success(result);
				return result;
			} else {
				let msg =
					"Retrieved object was not a " +
					result.getFullType();
				if (failure != null) failure(msg);
				else throw new Error(msg);
			}
		}, failure);
	}
	static searchAs(
		repo,
		query,
		factory,
		success,
		failure,
		paramObj,
		eim
	) {
		if (paramObj == null) paramObj = {};
		let template = factory();
		let queryAdd = template.getSearchStringByType();
		paramObj["index_hint"] =
			"*" + template.type.toLowerCase() + ",*encryptedvalue";
		if (query == null || query == "") query = queryAdd;
		else query = "(" + query + ") AND " + queryAdd;
		return cassPromisify(
			repo.searchWithParams(query, paramObj, null, null, null, eim).then((p1s) => {
				return Promise.all(
					p1s.map((p1) => EcEncryptedValue.fromEncryptedValue(p1, null, null, eim))
				).then((results) =>
					results.map((result) => factory().copyFrom(result))
				);
			}),
			success,
			failure
		);
	}
};
module.exports.static();