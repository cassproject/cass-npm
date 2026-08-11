
const {cassPromisify} = require("../../../../../com/eduworks/ec/promises/helpers");
const EcRemote = require("../../../../../com/eduworks/ec/remote/EcRemote");
const FormData = EcRemote.FormData;
const EbacCredentialCommit = require("../../../../../com/eduworks/schema/ebac/EbacCredentialCommit");
const EbacCredentialRequest = require("../../../../../com/eduworks/schema/ebac/EbacCredentialRequest");
const EcContact = require("../EcContact");
const EcIdentity = require("../EcIdentity");
const EcIdentityManager = require("../EcIdentityManager");
const RemoteIdentityManagerInterface = require("./RemoteIdentityManagerInterface");
let forge = require("node-forge");
const EcPpkFacade = require("../../../../../com/eduworks/ec/crypto/EcPpkFacade");
require("../../../general/AuditLogger.js")

/**
 *  Logs into and stores/retrieves credentials from a compatible remote server.
 *  Performs anonymization of the user.
 *  <p>
 *  Requires initialization with server specific salts. Server specific salts
 *  prevent co-occurrence attacks, should credentials on one server be
 *  compromised (intercepted in transit).
 *  <p>
 *  Transmits hashed username, hashed password, and encrypts credentials using
 *  the hashed combination of the username and password. This prevents the system
 *  storing the credentials from having any knowledge of the user.
 *  <p>
 *  Password recovery is done by, when the password changes, creating a
 *  cryptographic pad (or perfect cipher) where one half is stored on the server,
 *  and the other half is stored with the user. Should the user lose this pad and
 *  forget their password, they are not able to recover or reset their password,
 *  and their data should be considered lost.
 *
 *  @author fritz.ray@eduworks.com
 *  @module com.eduworks.ec
 *  @class EcRemoteIdentityManager
 */
module.exports = class EcRemoteIdentityManager extends RemoteIdentityManagerInterface {
	server = null;
	// global = null;
	usernameWithSalt = null;
	passwordWithSalt = null;
	secretWithSalt = null;
	pad = null;
	token = null;
	usernameSalt = null;
	usernameIterations = 0;
	usernameWidth = 0;
	passwordSalt = null;
	passwordIterations = 0;
	passwordWidth = 0;
	secretSalt = null;
	secretIterations = 0;
	configured = false;
	signatureSheetHashAlgorithm;
	/**
	 *  Returns true if the identity manager is global. Returns false if the identity manager is local to the server.
	 *
	 *  @return {Boolean} true if the identity manager is global.
	 *  @memberOf EcRemoteIdentityManager
	 */
	isGlobal() {
		if (this.global == null) return false;
		return this.global;
	}
	/**
	 *  Configure parameters of the remote login storage.
	 *
	 *  @param {String} usernameSalt
	 *                  Salt used in hashing the username.
	 *  @param {int}    usernameIterations
	 *                  Number of times to hash the username.
	 *  @param {int}    usernameWidth
	 *                  Resultant width of username in bytes.
	 *  @param {String} passwordSalt
	 *                  Salt used to hash password.
	 *  @param {int}    passwordIterations
	 *                  Number of times to hash password.
	 *  @param {int}    passwordWidth
	 *                  Resultant width of password in bytes.
	 *  @param {String} secretSalt
	 *                  Salt used to hash secret (composed of username + password)
	 *  @param {int}    secretIterations
	 *                  Number of times to hash secret.
	 *  @memberOf EcRemoteIdentityManager
	 *  @method configure
	 */
	configure(
		usernameSalt,
		usernameIterations,
		usernameWidth,
		passwordSalt,
		passwordIterations,
		passwordWidth,
		secretSalt,
		secretIterations
	) {
		this.usernameSalt = usernameSalt;
		this.usernameIterations = usernameIterations;
		this.usernameWidth = usernameWidth;
		this.passwordSalt = passwordSalt;
		this.passwordIterations = passwordIterations;
		this.passwordWidth = passwordWidth;
		this.secretSalt = secretSalt;
		this.secretIterations = secretIterations;
		this.configured = true;
	}
	/**
	 *  Configures parameters of the remote server by accessing configuration details via webservice
	 *
	 *  @param {Callback1<Object>} success
	 *                             Callback triggered after successfully configured
	 *  @param {Callback1<String>} failure
	 *                             Callback triggered if an error during failure
	 *  @memberOf EcRemoteIdentityManager
	 *  @method configureFromServer
	 */
	async configureFromServer(success, failure) {
		let me = this;
		return cassPromisify(
			EcRemote.getExpectingObject(
				this.server,
				"sky/id/salts",
				function (p1) {
					me.usernameSalt = p1["usernameSalt"];
					if (me.usernameSalt.length < 16) {
						throw new Error("Insufficient length on Username Salt");
					}
					me.usernameIterations = Math.trunc(
						p1["usernameIterations"]
					);
					if (me.usernameIterations < 1000) {
						throw new Error(
							"Insufficient iterations on Username Hash"
						);
					}
					me.usernameWidth = Math.trunc(p1["usernameLength"]);
					if (me.usernameWidth != 64) {
						throw new Error(
							"Username Hash required to be length 64."
						);
					}
					me.passwordSalt = p1["passwordSalt"];
					if (me.passwordSalt.length < 16) {
						throw new Error("Insufficient length on Password Salt");
					}
					me.passwordIterations = Math.trunc(
						p1["passwordIterations"]
					);
					if (me.passwordIterations < 1000) {
						throw new Error(
							"Insufficient iterations on Password Hash"
						);
					}
					me.passwordWidth = Math.trunc(p1["passwordLength"]);
					if (me.passwordWidth != 64) {
						throw new Error(
							"Password Hash required to be length 64."
						);
					}
					me.secretSalt = p1["secretSalt"];
					if (me.secretSalt.length < 16) {
						throw new Error("Insufficient length on Secret Salt");
					}
					me.secretIterations = Math.trunc(p1["secretIterations"]);
					if (me.secretIterations < 1000) {
						throw new Error(
							"Insufficient iterations on Secret Hash"
						);
					}
					me.signatureSheetHashAlgorithm = p1["signatureSheetHashAlgorithm"];
					me.configured = true;
					return p1;
				},
				function (p1) {
					me.configured = false;
					throw new Error(p1);
				}
			),
			success,
			failure
		);
	}
	/**
	 *  Wipes login data.
	 *
	 *  @memberOf EcRemoteIdentityManager
	 *  @method clear
	 */
	clear() {
		this.usernameWithSalt = null;
		this.passwordWithSalt = null;
		this.secretWithSalt = null;
		this.pad = null;
		this.token = null;
	}
	/**
	 *  Configure compatible remote identity management server.
	 *
	 *  @param {String} server
	 *                  URL to remote identity management server.
	 *  @memberOf EcRemoteIdentityManager
	 *  @method setDefaultIdentityManagementServer
	 */
	setDefaultIdentityManagementServer(server) {
		this.server = server;
	}
	/**
	 *  "Log Into" system, generating credentials. Does not actually remotely
	 *  access any machine.
	 *  <p>
	 *  Please clear username and password fields after this function is called.
	 *
	 *  @param {String} username
	 *                  Username to login with
	 *  @param {String} password
	 *                  Password to authenticate username with
	 *  @memberOf EcRemoteIdentityManager
	 *  @method startLogin
	 */
	startLogin(username, password) {
		if (!this.configured) {
			throw new Error("Remote Identity not configured.");
		}
		this.usernameWithSalt = forge.util.encode64(
			forge.pkcs5.pbkdf2(
				username,
				this.usernameSalt,
				this.usernameIterations,
				this.usernameWidth
			)
		);
		this.passwordWithSalt = forge.util.encode64(
			forge.pkcs5.pbkdf2(
				password,
				this.passwordSalt,
				this.passwordIterations,
				this.passwordWidth
			)
		);
		let arys = [];
		arys.push(username, password);
		let secret = this.splicePasswords(arys);
		this.secretWithSalt = forge.util.encode64(
			forge.pkcs5.pbkdf2(
				secret,
				this.secretSalt,
				this.secretIterations,
				32
			)
		);
	}
	/**
	 *  Change password of user in memory. Does not automatically commit new credentials.
	 *  <p>
	 *  Please clear username and password fields after this function is called.
	 *
	 *  @param {String} username
	 *                  Username
	 *  @param {String} oldPassword
	 *                  Current password
	 *  @param {String} newPassword
	 *                  Desired password
	 *  @return {boolean}
	 *  Valid password change request.
	 *  @memberOf EcRemoteIdentityManager
	 *  @method changePassword
	 */
	changePassword(username, oldPassword, newPassword) {
		let usernameHash = forge.util.encode64(
			forge.pkcs5.pbkdf2(
				username,
				this.usernameSalt,
				this.usernameIterations,
				this.usernameWidth
			)
		);
		if (this.usernameWithSalt != usernameHash) {
			throw new Error(
				"Username does not match. Aborting password change."
			);
		}
		let oldPasswordHash = forge.util.encode64(
			forge.pkcs5.pbkdf2(
				oldPassword,
				this.passwordSalt,
				this.passwordIterations,
				this.passwordWidth
			)
		);
		if (this.passwordWithSalt != oldPasswordHash) {
			throw new Error(
				"Old password does not match. Aborting password change."
			);
		}
		this.passwordWithSalt = forge.util.encode64(
			forge.pkcs5.pbkdf2(
				newPassword,
				this.passwordSalt,
				this.passwordIterations,
				this.passwordWidth
			)
		);
		let arys = [];
		arys.push(username, newPassword);
		let secret = this.splicePasswords(arys);
		this.secretWithSalt = forge.util.encode64(
			forge.pkcs5.pbkdf2(
				secret,
				this.secretSalt,
				this.secretIterations,
				32
			)
		);
		return true;
	}
	/**
	 *  Fetch credentials from server, invoking events based on login success or
	 *  failure.
	 *  <p>
	 *  Automatically populates EcIdentityManager.
	 *  <p>
	 *  Requires login().
	 *
	 *  @param {Callback1<Object>} success
	 *  @param {Callback1<String>} failure
	 *  @memberOf EcRemoteIdentityManager
	 *  @method fetch
	 */
	fetch(success, failure) {
		if (!this.configured) {
			failure("Remote Identity not configured.");
			return;
		}
		if (
			this.usernameWithSalt == null ||
			this.passwordWithSalt == null ||
			this.secretWithSalt == null
		) {
			failure("Please log in before performing this operation.");
			return;
		}
		let r = new EbacCredentialRequest();
		r.username = this.usernameWithSalt;
		r.password = this.passwordWithSalt;
		let fd = new FormData();
		fd.append("credentialRequest", r.toJson());
		let me = this;
		return cassPromisify(
			EcRemote.postExpectingObject(
				this.server,
				"sky/id/login",
				fd,
				async (arg0) => {
					let eim = new EcIdentityManager();
					let cs = arg0;
					me.pad = cs.pad;
					me.token = cs.token;
					let shouldCommit = false;
					if (cs.credentials != null)
						for (let i = 0; i < cs.credentials.length; i++) {
							let c = cs.credentials[i];
							let identity = null;
							try{
								identity = await EcIdentity.fromCredential(
									c,
									me.secretWithSalt,
									me.server
								);
							} 
							catch(ex)
							{
								global.auditLogger.report(global.auditLogger.LogCategory.SYSTEM, global.auditLogger.Severity.ERROR, "EcRemoIdenManaFetch", ex);
							}
							if (identity == null || identity.ppk == null)
							{						
								//Try alternate method of getting credential.
								let newSecretWithSalt = forge.util.encode64(forge.pkcs5.pbkdf2('',this.secretSalt,this.secretIterations,32));								
								identity = await EcIdentity.fromCredential(
									c,
									newSecretWithSalt,
									me.server
								);
								shouldCommit = true;
							}
							if (identity.ppk == null)
								throw new Error("Could not retreive encrypted ppks from credential packet.")
							identity.lastLogin = cs.lastLogin;
							eim.addIdentity(identity);
						}
					if (cs.contacts != null)
						for (let i = 0; i < cs.contacts.length; i++) {
							let c = cs.contacts[i];
							let identity = null;
							try{
								identity = await EcContact.fromEncryptedContact(
									c,
									me.secretWithSalt,
									me.server
								);
							} 
							catch(ex)
							{
								global.auditLogger.report(global.auditLogger.LogCategory.SYSTEM, global.auditLogger.Severity.ERROR, "EcRemoIdenManaFetch", ex);
							}
							if (identity == null || identity.pk == null)
							{					
								//Try alternate method of getting contact.
								let newSecretWithSalt = forge.util.encode64(forge.pkcs5.pbkdf2('',this.secretSalt,this.secretIterations,32));								
								identity = await EcContact.fromEncryptedContact(
									c,
									newSecretWithSalt,
									me.server
								);
								shouldCommit = true;
							}					
							if (identity.pk == null)
								throw new Error("Could not retreive encrypted pks from credential packet.")		
							eim.addContact(identity);
						}
						if (shouldCommit)
							await me.commit(null,null,eim);
					return eim;
				},
				function (arg0) {
					global.auditLogger.report(global.auditLogger.LogCategory.SYSTEM, global.auditLogger.Severity.ERROR, "EcRemoIdenManaFetch", arg0);
					throw new Error(arg0);
				}
			),
			success,
			failure
		);
	}
	/**
	 *  Commits credentials in EcIdentityManager to remote server.
	 *  <p>
	 *  Will trigger pad generation and fail if the pad has not been specified.
	 *
	 *  @param {Callback1<String>}   success
	 *  @param {Callback1<String>}   failure
	 *  @memberOf EcRemoteIdentityManager
	 *  @method commit
	 */
	async commit(success, failure, eim) {
		let service = "sky/id/commit";
		return this.sendCredentials(success, failure, service, eim);
	}
	/**
	 *  Creates an account.
	 *  <p>
	 *  Please note that the remote login server does not throw error messages if
	 *  an account creation is blocked due to being a duplicate. This prevents
	 *  login probing. This will always succeed (if the request is properly
	 *  formed and makes it to the server).
	 *  <p>
	 *  Will trigger pad generation and fail if the pad has not been specified.
	 *
	 *  @param {Callback1<String>}   success
	 *                               Callback triggered after successfully creating an account
	 *  @param {Callback1<String>}   failure
	 *                               Callback triggered if error creating an account
	 *  @memberOf EcRemoteIdentityManager
	 *  @method create
	 */
	async create(success, failure, eim) {
		let service = "sky/id/create";
		return this.sendCredentials(success, failure, service, eim);
	}
	/**
	 *  Sends the identity managers credentials to the service specified
	 *
	 *  @param {Callback1<String>}   success
	 *                               Callback triggered if credentials sent successfully
	 *  @param {Callback1<String>}   failure
	 *                               Callback triggered if error sending credentials
	 *  @param service               Service to send credentials to on server
	 *  @memberOf EcRemoteIdentityManager
	 *  @method sendCredentials
	 */
	async sendCredentials(success, failure, service, eim) {
		if (eim === undefined || eim == null)
			eim = EcIdentityManager.default;
		if (!this.configured)
			throw new Error("Remote Identity not configured.");
		if (
			this.usernameWithSalt == null ||
			this.passwordWithSalt == null ||
			this.secretWithSalt == null
		) {
			throw new Error("Please log in before performing this operation.");
		}
		let credentials = [];
		let contacts = [];
		for (let i = 0; i < eim.ids.length; i++) {
			let id = eim.ids[i];
			if (id.source != null && id.source != this.server) continue;
			id.source = this.server;
			credentials.push(await id.toCredential(this.secretWithSalt));
		}
		for (let i = 0; i < eim.contacts.length; i++) {
			let id = eim.contacts[i];
			if (id.source != null && id.source != this.server) continue;
			id.source = this.server;
			contacts.push(await id.toEncryptedContact(this.secretWithSalt));
		}
		let commit = new EbacCredentialCommit();
		commit.username = this.usernameWithSalt;
		commit.password = this.passwordWithSalt;
		commit.token = this.token;
		commit.credentials.pad = this.pad;
		commit.credentials.credentials = credentials;
		commit.credentials.contacts = contacts;
		let fd = new FormData();
		fd.append("credentialCommit", commit.toJson());
		let me = this;
		return cassPromisify(
			eim.signatureSheet(
				60000,
				this.server,
				async (p1) => {
					fd.append("signatureSheet", p1);
					return await EcRemote.postExpectingString(
						me.server,
						service,
						fd,
						function (arg0) {
							return arg0;
						},
						function (arg0) {
							throw new Error(arg0);
						}
					);
				},
				function (arg0) {
					throw new Error(arg0);
				}, this.signatureSheetHashAlgorithm
			),
			success,
			failure
		);
	}
	/**
	 *  Splices together passwords (in a fashion more like shuffling a deck of
	 *  cards, not appending).
	 *
	 *  @param {String[]} passwords
	 *                    Passwords to splice.
	 *  @return {String}
	 *  Spliced password.
	 *  @memberOf EcRemoteIdentityManager
	 *  @method splicePasswords
	 */
	splicePasswords(passwords) {
		let passwordSplice = "";
		for (let charIndex = 0; true; charIndex++) {
			let foundAny = false;
			for (
				let passwordIndex = 0;
				passwordIndex < passwords.length;
				passwordIndex++
			) {
				if (charIndex >= passwords[passwordIndex].length) continue;
				passwordSplice += passwords[passwordIndex].charAt(charIndex);
				foundAny = true;
			}
			if (!foundAny) break;
		}
		return passwordSplice;
	}
};
