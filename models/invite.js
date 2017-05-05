var Invite = Protected.extend({
	public_fields: [
		'id',
		'space_id',
		'from_user_id',
		'from_username',
		'to_user',
		'role',
		'is_passphrase_protected',
		'is_pubkey_protected',
		'title',
	],

	private_fields: [
		'message'
	],

	default_passphrase: 'this is the default passphrase lol',

	sync: RemoteSync,
	url: function() {
		var base = '/spaces/'+this.get('space_id')+'/invites';
		if(!this.is_new()) base += '/'+this.id();
		return base;
	},

	// used by the member controller
	get_email: function() {
		var email = this.get('to_user');
		return email && email.toLowerCase();
	},

	// -------------------------------------------------------------------------
	// NOTE: the invite's version of (de)serialize() only actually runs the
	// crypto operations if we specifically tell it to via an option argument.
	// the reason behind this is that the SyncCollection.run_incoming_sync_item
	// will call deserialize() on an incoming invite, and if that invite is
	// passphrase-protected, the crypto will fail. bad news bears.
	//
	// since all the data we need to display/interact with invites is in the
	// public data, we only really need to (de)serialize when we open/seal the
	// invite.
	serialize: function(options) {
		options || (options = {});
		if(!options.run_crypto) return Promise.resolve([this.safe_json(), null]);
		if(!this.key) this.gen_invite_key();
		return this.parent.apply(this, arguments);
	},

	deserialize: function(options) {
		options || (options = {});
		if(!options.run_crypto) return Promise.resolve();
		if(!this.key) this.gen_invite_key();
		return this.parent.apply(this, arguments);
	},
	// -------------------------------------------------------------------------

	gen_invite_key: function(passphrase) {
		if(!passphrase) passphrase = this.default_passphrase;
		var hashme = 'invite salt';
		var saltlen = tcrypt.keygen_saltlen();
		var salt = tcrypt.sha512(tcrypt.from_string(hashme)).slice(0, saltlen);
		var key = tcrypt.keygen(passphrase, salt);
		this.key = key;
		return key;
	},

	seal: function(pubkey, passphrase) {
		var space_key = this.get('space_key');
		if(!space_key) return Promise.reject(new Error('invite.seal() -- no space key present'));
		var message = JSON.stringify({space_key: space_key});
		if(pubkey) {
			pubkey = tcrypt.from_base64(pubkey);
			var encrypted = tcrypt.asym.encrypt(pubkey, tcrypt.from_string(message));
			message = tcrypt.to_base64(encrypted);
		}
		this.gen_invite_key(passphrase);
		this.set({
			message: message,
			is_passphrase_protected: !!passphrase,
			is_pubkey_protected: !!pubkey,
		});
		return this.serialize({run_crypto: true});
	},

	open: function(pubkey, privkey, passphrase) {
		this.gen_invite_key(passphrase);
		return this.deserialize({run_crypto: true})
			.bind(this)
			.then(function() {
				var message = this.get('message');
				if(this.get('is_pubkey_protected')) {
					pubkey = tcrypt.from_base64(pubkey);
					privkey = tcrypt.from_base64(privkey);
					message = tcrypt.asym.decrypt(pubkey, privkey, tcrypt.from_base64(message));
					message = tcrypt.to_string(message)
				}
				message = JSON.parse(message); 
				this.set(message);
			});
	},

	// a little tricky hack to ALWAYS send the ID with save()
	save: function(options) {
		var id = this.id();
		var _tmp_safe = this.safe_json.bind(this);
		this.safe_json = function() {
			var data = _tmp_safe.apply(arguments);
			data.id = id;
			return data;
		};
		var promise = this.parent.apply(this, arguments);
		this.safe_json = _tmp_safe;
		return promise;
	},

	accept: function() {
		return turtl.api.post('/spaces/'+this.get('space_id')+'/invites/accepted/'+this.id());
	},
});

var Invites = SyncCollection.extend({
	model: Invite,
});

