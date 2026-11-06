const EcPk = require("../../../../../com/eduworks/ec/crypto/EcPk");
const EcIdentityManager = require("../EcIdentityManager");
/**
 *  Created by fray on 5/9/17.
 */
module.exports = class OAuth2FileBasedRemoteIdentityManager extends
	RemoteIdentityManagerInterface {
	/**
	 *  Reads the remote OAuth2 endpoint file.
	 *
	 *  @param {Callback0} Method to call when initialization is complete.
	 *  @memberOf OAuth2FileBasedRemoteIdentityManager
	 *  @constructor
	 */
	constructor() {
		super();
		EcRemote.getExpectingObject(
			"",
			"hello.json",
			(o) => {
				try {
					this.configuration = structuredClone(o);
					hello.init(o);
					this.oauthEnabled = true;
					initialized();
				} catch (ex) { // NOSONAR - hello.js missing, a bad configuration or no initialized() hook: run without OAuth.
					this.oauthEnabled = false;
				}
			},
			(s) => {
				this.oauthEnabled = false;
			}
		);
	}
	static oauthEnabled = false;
	server = null;
	configuration = null;
	oauthLoginResponse = null;
	network = null;
	// global = null;
	/**
	 *  Returns true if the identity manager is global. Returns false if the identity manager is local to the server.
	 *
	 *  @return {Boolean} true if the identity manager is global.
	 *  @memberOf OAuth2FileBasedRemoteIdentityManager
	 *  @method isGlobal
	 */
	isGlobal() {
		if (this.global == null) return true;
		return this.global;
	}
	configureFromServer(success, failure) {
		success(null);
	}
	/**
	 *  Wipes login data and logs you out.
	 *
	 *  @memberOf OAuth2FileBasedRemoteIdentityManager
	 *  @method clear
	 */
	clear() {
		OAuth2FileBasedRemoteIdentityManager.oauthEnabled = false;
		if (this.server != null) hello.logout(this.server, null);
	}
	/**
	 *  Configure compatible remote identity management server.
	 *
	 *  @param {String} server
	 *                  Name of the remote identity management server.
	 *  @memberOf OAuth2FileBasedRemoteIdentityManager
	 *  @method setDefaultIdentityManagementServer
	 */
	setDefaultIdentityManagementServer(server) {
		this.server = server;
	}
	changePassword(username, oldPassword, newPassword) {
		return false;
	}
	/**
	 *  Fetch credentials from server, invoking events based on login success or
	 *  failure.
	 *  <p>
	 *  Automatically populates EcIdentityManager.
	 *  <p>
	 *  Does not require startLogin().
	 *
	 *  @param {Callback1<Object>} success
	 *  @param {Callback1<String>} failure
	 *  @memberOf OAuth2FileBasedRemoteIdentityManager
	 *  @method fetch
	 */
	fetch(success, failure) {
		let o = {};
		o["scope"] = this.configuration[this.server + "Scope"];
		o["display"] = "page";
		hello.on("auth.login", (o) => {
			this.oauthLoginResponse = o;
			this.network = this.oauthLoginResponse["network"];
			hello
				.api(this.network + "/me/folders", "get", {})
				.then((folderResponse) => {
					let folders = folderResponse["data"];
					let foundIdentities = false;
					let foundContacts = false;
					for (const d of folders) {
						let name = d["name"];
						let id = d["id"];
						if (name == "CASS Identities") {
							foundIdentities = true;
							this.hookIdentityManagerIdentities(id);
							this.readIdentityFiles(id, success, failure);
						}
						if (name == "CASS Contacts") {
							foundContacts = true;
							this.hookIdentityManagerContacts(id);
							this.readContactFiles(id, success, failure);
						}
					}
					if (!foundIdentities) {
						this.createIdentityFolder(success);
					}
					if (!foundContacts) {
						this.createContactFolder();
					}
				})
				.fail(failure);
		});
		hello.login(this.server, o).fail(failure);
	}
	createContactFolder() {
		let o = {};
		o["name"] = "CASS Contacts";
		hello.api(this.network + "/me/folders", "post", o).then((r) => {
			this.hookIdentityManagerContacts(r["id"]);
		});
	}
	createIdentityFolder(success) {
		let o = {};
		o["name"] = "CASS Identities";
		hello.api(this.network + "/me/folders", "post", o).then((r) => {
			this.hookIdentityManagerIdentities(r["id"]);
			success(r);
		});
	}
	writeIdentityFiles(folderId, success, eim) {
		if (eim === undefined || eim == null)
			eim = EcIdentityManager.default;
		let helper = new EcAsyncHelper();
		helper.each(
			eim.ids,
			(identity, callback0) => {
				this.writeIdentityFile(folderId, identity, callback0);
			},
			function(strings) {
				success(strings);
			}
		);
	}
	writeIdentityFile(folderId, identity, finished) {
		let file = stringToFile(
			identity.ppk.toPem(),
			identity.displayName + ".pem",
			"text/plain"
		);
		let o = {};
		o["id"] = identity["id"];
		if (o["id"] == undefined) o["parent"] = folderId;
		o["name"] = file.name;
		let files = [];
		files.push(file);
		o["file"] = files;
		hello
			.api(
				this.network + "/me/files",
				identity["id"] == undefined ? "post" : "put",
				o
			)
			.then(function(r) {
				identity["id"] = r["id"];
				if (finished != null) finished();
			});
	}
	writeContactFiles(folderId, eim) {
		if (eim === undefined || eim == null)
			eim = EcIdentityManager.default;
		for (const contact of eim.contacts) {
			this.writeContactFile(folderId, contact);
		}
	}
	writeContactFile(folderId, contact) {
		let file = stringToFile(
			contact.pk.toPem(),
			contact.displayName + ".pem",
			"text/plain"
		);
		let o = {};
		o["id"] = contact["id"];
		if (o["id"] == undefined) o["parent"] = folderId;
		o["name"] = file.name;
		let files = [];
		files.push(file);
		o["file"] = files;
		hello
			.api(
				this.network + "/me/files",
				contact["id"] == undefined ? "post" : "put",
				o
			)
			.then(function(r) {
				contact["id"] = r["id"];
			});
	}
	readIdentityFiles(folderId, success, failure, eim) {
		let o = {};
		o["parent"] = folderId;
		if (eim === undefined || eim == null)
			eim = EcIdentityManager.default;
		hello
			.api(this.network + "/me/files", "get", o)
			.then((folderResponse) => {
				let files = folderResponse["data"];
				let h = new EcAsyncHelper();
				h.each(
					files,
					(d, callback0) => {
						let name = d["name"].replace(String.raw`\.pem`, "");
						let id = d["id"];
						let directLink = d["downloadUrl"];
						EcRemote.getExpectingString(
							"",
							directLink +
								"&access_token=" +
								hello.getAuthResponse(this.network)[
									"access_token"
								],
							function(s) {
								let identity = new EcIdentity();
								identity.displayName = name.replace(".pem", "");
								identity.ppk = EcPpk.fromPem(s);
								identity.source = "google";
								identity["id"] = id;
								eim.addIdentityQuietly(identity);
								callback0();
							},
							failure
						);
					},
					function(strings) {
						success(eim);
					}
				);
			});
	}
	readContactFiles(folderId, success, failure, eim) {
		let o = {};
		o["parent"] = folderId;
		if (eim === undefined || eim == null)
			eim = EcIdentityManager.default;
		hello
			.api(this.network + "/me/files", "get", o)
			.then((folderResponse) => {
				let files = folderResponse["data"];
				let h = new EcAsyncHelper();
				h.each(
					files,
					(d, callback0) => {
						let name = d["name"].replace(String.raw`\.pem`, "");
						let id = d["id"];
						let directLink = d["downloadUrl"];
						EcRemote.getExpectingString(
							"",
							directLink +
								"&access_token=" +
								hello.getAuthResponse(this.network)[
									"access_token"
								],
							function(s) {
								let contact = new EcContact();
								contact.displayName = name.replace(".pem", "");
								contact.pk = EcPk.fromPem(s);
								contact.source = "google";
								contact["id"] = id;
								eim.addContactQuietly(contact);
								callback0();
							},
							failure
						);
					},
					function(strings) {
						success(null);
					}
				);
			});
	}
	hookIdentityManagerIdentities(folderId, eim) {
		if (eim === undefined || eim == null)
			eim = EcIdentityManager.default;
		eim.onIdentityChanged = (identity) => {
			this.writeIdentityFile(folderId, identity, null);
		};
	}
	hookIdentityManagerContacts(folderId, eim) {
		if (eim === undefined || eim == null)
			eim = EcIdentityManager.default;
		eim.onContactChanged = (contact) => {
			this.writeContactFile(folderId, contact);
		};
	}
	/**
	 *  Commits credentials in EcIdentityManager to remote server.
	 *
	 *  @param {Callback1<String>}   success
	 *  @param {Callback1<String>}   failure
	 *  @memberOf OAuth2FileBasedRemoteIdentityManager
	 *  @method commit
	 */
	commit(success, failure) {
		let apio = {};
		apio["network"] = this.network;
		if (hello.getAuthResponse(this.server))
			hello
				.api(this.network + "/me/folders", "get", apio)
				.then((folderResponse) => {
					let folders = folderResponse["data"];
					for (const d of folders) {
						let name = d["name"];
						let id = d["id"];
						if (name == "CASS Identities") {
							this.writeIdentityFiles(id, success);
						}
						if (name == "CASS Contacts") {
							this.writeContactFiles(id);
						}
					}
				})
				.fail(failure);
		else failure("Please login again.");
	}
	create(success, failure) {
		let o = {};
		o["scope"] = this.configuration[this.server + "Scope"];
		hello.on("auth.login", (o) => {
			this.oauthLoginResponse = o;
			this.network = this.oauthLoginResponse["network"];
			hello
				.api(this.network + "/me/folders", "get", {})
				.then((folderResponse) => {
					let folders = folderResponse["data"];
					let foundIdentities = false;
					let foundContacts = false;
					for (const d of folders) {
						let name = d["name"];
						let id = d["id"];
						if (name == "CASS Identities") {
							foundIdentities = true;
							this.hookIdentityManagerIdentities(id);
							this.readIdentityFiles(id, success, failure);
						}
						if (name == "CASS Contacts") {
							foundContacts = true;
							this.hookIdentityManagerContacts(id);
							this.readContactFiles(id, success, failure);
						}
					}
					if (!foundIdentities) {
						this.createIdentityFolder(success);
					}
					if (!foundContacts) {
						this.createContactFolder();
					}
				})
				.fail(failure);
		});
		hello.login(this.server, o).fail(failure);
	}
};
