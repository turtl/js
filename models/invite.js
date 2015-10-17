var Invite = ProtectedShared.extend({
	base_url: '/invites',

	relations: {
		from_persona: {model: 'Persona'},
		to_persona: {model: 'Persona'}
	},

	public_fields: [
		'id',
		'object_id',
		'perms',
		'token_server',
		'has_passphrase',
		'has_persona',
		'from',
		'to',
		'title'
	],

	private_fields: [
		'key',
		'token',
		'message'
	],

	init: function()
	{
		// we always give invites a unique id
		if(this.is_new()) this.set({id: this.cid()});
	},

	safe_json: function()
	{
		// we don't want the from_persona to get serialized, but we do want it
		// to return when we save the model.
		var data = this.parent.apply(this, arguments);
		var persona = this.get('from_persona');
		if(!persona.is_new()) data.from_persona = persona.safe_json();
		return data;
	},

	generate_token: function()
	{
		var token = tcrypt.uuid();
		this.set({token: token, token_server: token});
	},

	passphrase_to_key: function(passphrase)
	{
		if(!passphrase)
		{
			// generate a static key. note that these values can never change
			// lest we break all non-protected pending invites
			var salt = tcrypt.hash('andrew rulez');
			var iter = 1;
			passphrase = tcrypt.hash('hai')
		}
		else
		{
			// generate a key from our passphrase
			var salt = tcrypt.hash(this.id());
			var iter = 100000;
		}
		var key = tcrypt.key_native(passphrase, salt, {key_size: 32, iterations: iter, hasher: 'SHA-256'})
		return Promise.resolve(key).bind(this)
			.catch(DOMException, function(err) {
				// probably some idiotic "safe origin" policy crap. revert to sync/SJCL method
				if(!(err instanceof DOMException))
				{
					log.error('invite: get_key: ', err);
				}
				return tcrypt.key(passphrase, salt, {key_size: 32, iterations: iter, hasher: tcrypt.get_hasher('SHA256')});
			})
			.tap(function(key) {
				this.key = key;
			});
	},

	seal: function(passphrase)
	{
		var promise = Promise.resolve(false);
		var persona = this.get('to_persona');
		var have_persona = !persona.is_new();
		var have_passphrase = !!passphrase;
		this.set({has_passphrase: have_passphrase});
		this.generate_token();
		return delay(1).bind(this)
			.then(function() {
				return this.passphrase_to_key(passphrase);
			})
			.then(function() {
				return this.serialize();
			})
			.then(function() {
				if(!have_persona) return;
				this.set({has_persona: true});
				this.public_key = persona.get('pubkey');
				return this.encrypt();
			})
			.then(function() {
				return this.safe_json();
			});
	},

	open: function(passphrase)
	{
		return delay(1).bind(this)
			.then(function() {
				return this.passphrase_to_key(passphrase);
			})
			.then(function() {
				if(!this.get('has_persona')) return;
				// TODO: try multiple personas
				var persona = turtl.profile.get('personas').first();
				this.private_key = persona.get('privkey');
				return this.decrypt();
			})
			.then(function() {
				return this.deserialize();
			})
			.tap(function() {
				if(this.get('token') != this.get('token_server'))
				{
					// overwrite the random token if we get one out of data
					this.set({token_server: this.get('token')});
				}
			});
	}
});

var BoardInvite = Invite.extend({
	create: function()
	{
		var passphrase = this.get('passphrase') || false;
		this.unset('passphrase');

		return this.seal(passphrase).bind(this)
			.then(function(invite_data) {
				return turtl.api.post('/boards/'+this.get('object_id')+'/invites', invite_data);
			})
			.tap(function(invite_data) {
				this.set(invite_data);
			});
	},

	accept: function()
	{
		var next = Promise.resolve();
		if(!this.get('token')) next = this.open();
		// make the call to the sharing API, accept the invite. if all goes well
		// it will just return the board data (ignored), and trigger a sync
		// action "board.share" that prompts the sync system to send the board
		// and all of its notes our way. in other words, we send a simple
		// "invite accept!" call and the rest happens via sync.
		return next.bind(this)
			.then(function() {
				if(!this.get('key')) throw new Error('invite key missing');
				if(!this.get('token')) throw new Error('invite token missing');
				var token = this.get('token');
				var key = this.get('key');
				var board_id = this.get('object_id');
				var persona_id = turtl.profile.get('personas').first().id();
				var keychain = turtl.profile.get('keychain');
				// add the key to the keychain BEFORE we accept via the API
				// because the sync record might come through before the call
				// finishes, and then we're screwed because we have a board w/
				// notes but no key in the keychain to decrypt them. now that's
				// what i call a STICKY SITUATION.
				return keychain.add_key(board_id, 'board', key).bind(this)
					.then(function() {
						var params = {
							'token': token,
							'to_persona_id': persona_id
						};
						var qs = Object.keys(params).map(function(key) { return key+'='+encodeURIComponent(params[key]);}).join('&');
						return turtl.api.put('/boards/'+this.get('object_id')+'/invites/'+this.id()+'/accept?'+qs)
					})
					.catch(function(err) {
						// failure? undo adding the key to the keychain, and
						// rethrow the error once done.
						return keychain.remove_key(board_id)
							.finally(function() { throw err; });
					});
			});
	},

	reject: function()
	{
		if(this.get('has_persona'))
		{
			// NOTE: we don't .then(destroy) here since the sync will probably
			// come through before the delete finishes, and the invite will be
			// destroyed then
			return turtl.api._delete('/boards/'+this.get('object_id')+'/invites/'+this.id());
		}
		else
		{
			// this is an invite added via code. we don't want to remove the
			// invite on the server because how do we verify we own it? instead
			// just remove it from local data, and never speak of this again...
			return this.destroy({skip_remote_sync: true});
		}
	},

	get_invite_from_code: function(code, options)
	{
		options || (options = {});

		var split = atob(code).split(/:/);
		var invite_id = split[0];
		var board_id = split[1];
		return turtl.api.get('/boards/'+board_id+'/invites/'+invite_id).bind(this)
			.then(function(invite_data) {
				var invite = new this.$constructor(invite_data);
				if(options.save)
				{
					return invite.save(options)
						.then(function() {
							turtl.profile.get('invites').add(invite, options);
							return invite;
						});
				}
				return invite;
			});
	}
});

var Invites = SyncCollection.extend({
	model: BoardInvite,

	run_incoming_sync_item: function(sync, item)
	{
		var promise = Promise.resolve();
		// hook into the actions that trigger deserialization and stop them
		switch(sync.action)
		{
			case 'add':
				var model = new this.model(item);
				this.upsert(model);

				var my_persona = turtl.profile.get('personas').first();
				if(!my_persona) return;
				var persona_id = my_persona.id();
				if(persona_id == model.get('to'))
				{
					var from = model.get('from_persona');
					var fromstr = from.get('name') ? from.get('name') : from.get('email');
					var msg = fromstr + ' shared a board with you. Open the "Sharing" panel to accept it.';
					turtl.events.trigger('notification:set', 'share', msg);
				}
				break;
			case 'edit':
				var model = this.get(item.id);
				if(model) model.set(item);
				break;
			default:
				promise = this.parent.apply(this, arguments);
				break;
		}
		return promise;
	}
});

/*
var Invite = Composer.Model.extend({
	encrypt_key: function(key, secret, options)
	{
		options || (options = {});
		secret || (secret = false);

		if(typeOf(secret) == 'string')
		{
			secret = secret.clean();
			// remember, this is insecure already, so making the secret actually
			// easy to enter is more of a priority
			if(options.normalize) secret = secret.toLowerCase().clean();
			if(secret == '') secret = false;
		}

		// create a key used to encrypt the board's key before emailing it
		var salt = (secret || '') + ':throw the NSA down the well';
		var encrypting_pass = tcrypt.uuid();
		var encrypting_key = tcrypt.key(encrypting_pass, salt, {key_size: 32, iterations: 400});

		// don't do encryption directly, use the Protected model.
		var keymodel = new InviteKey({key: tcrypt.key_to_string(key)});
		keymodel.key = encrypting_key;
		return {
			encrypted_key: keymodel.toJSON().body,
			encrypting_pass: encrypting_pass,
			used_secret: !!secret
		};
	},

	decrypt_key: function(encrypted_key, encrypting_pass, secret, options)
	{
		options || (options = {});
		secret || (secret = false);

		if(typeOf(secret) == 'string')
		{
			secret = secret.clean();
			// remember, this is insecure already, so making the secret actually
			// easy to enter is more of a priority
			if(options.normalize) secret = secret.toLowerCase();
			if(secret == '') secret = false;
		}

		// create a key used to encrypt the board's key before emailing it
		var salt = (secret || '') + ':throw the NSA down the well';
		var encrypting_key = tcrypt.key(encrypting_pass, salt, {key_size: 32, iterations: 400});

		// don't do encryption directly, use the Protected model.
		var keymodel = new InviteKey();
		keymodel.key = encrypting_key;
		keymodel.set({body: encrypted_key});
		return keymodel.get('key');
	},

	accept: function(persona, options)
	{
		var item_key = tcrypt.key_to_bin(this.get('item_key'));
		var item_id = this.get('item_id');

		return turtl.api.post('/invites/accepted/'+this.id(), {
			code: this.get('code'),
			persona: persona.id()
		}).bind(this)
			.then(function(res) {
				// we have no more use for this invite
				if(window.port) window.port.send('invite-remove', this.id());

				// if we have an item id/key, save them to the user's
				// keychain
				if(item_key && item_id)
				{
					turtl.profile.get('keychain').add_key(item_id, 'board', item_key);
				}

				var promise = null;
				switch(this.get('type'))
				{
				case 'b':
					var board = new Board({id: item_id});
					board.key = item_key;
					promise = board.from_share(res);
					break;
				default:
					promise = Promise.resolve();
					break;
				}

				return promise;
			});
	},

	deny: function(persona, options)
	{
		return turtl.api.post('/invites/denied/'+this.id(), {
			code: this.get('code'),
			persona: persona.id()
		}).bind(this)
			.then(function() {
				// we have no more use for this invite
				if(window.port) window.port.send('invite-remove', this.id());
			});
	}
});

var InviteKey = Protected.extend({
	private_fields: ['key']
});

var BoardInvite = Invite.extend({
	send: function(from_persona, board, question, secret, options)
	{
		secret || (secret = false);
		options || (options = {});

		// make sure we have an email (kinda)
		if(!this.get('email', '').clean().match(/@/)) return false;

		var encdata = this.encrypt_key(board.key, secret, {normalize: true});
		var encrypted_key = encdata.encrypted_key;
		var encrypting_pass = encdata.encrypting_pass;
		var used_secret = encdata.used_secret;

		return turtl.api.post('/invites/boards/'+board.id(), {
			persona: from_persona.id(),
			to: this.get('email'),
			key: encrypting_pass,
			board_key: encrypted_key,
			question: question,
			used_secret: used_secret ? 1 : 0
		}).bind(this)
			.then(function(invite) {
				if(invite.priv)
				{
					var privs = Object.clone(board.get('privs', {}));
					privs[invite.id] = invite.priv;
					board.set({privs: privs});
				}
			});
	},

	cancel: function(board, options)
	{
		options || (options = {});

		return turtl.api._delete('/invites/'+this.id(), {}).bind(this)
			.then(function() {
				var privs = Object.clone(board.get('privs', {}));
				delete privs[this.id()];
				board.set({privs: privs});
			});
	}
});

var Invites = Composer.Collection.extend({
	model: Invite
});
*/

