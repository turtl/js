var Persona = Protected.extend({
	base_url: '/personas',

	public_fields: [
		'id',
		'user_id',
		'pubkey',
		'email',
		'name',
		'settings'
	],

	private_fields: [
		'privkey'
	],

	initialize: function(data)
	{
		// steal user's key for this persona
		if(turtl.user.logged_in && data && data.user_id == turtl.user.id())
		{
			this.key = turtl.user.get_key();
		}

		// fix "false" pubkey bug
		if(data && data.pubkey && data.pubkey == 'false') data.pubkey = false;

		// carry on
		return this.parent.apply(this, arguments);
	},

	init: function()
	{
		this.bind('destroy', function() {
			var settings = Object.clone(turtl.user.get('settings').get_by_key('personas').value());
			delete settings[this.id()];
			turtl.user.get('settings').get_by_key('personas').value(settings);
		}.bind(this), 'persona:user:cleanup');

		this.bind('change:pubkey', function() {
			if(this.get('user_id') != turtl.user.id()) return false;
			var persona = turtl.user.get('personas').find_by_id(this.id());
			if(!persona || persona.has_keypair()) return false;

			log.warn('persona: old (or missing) RSA key detected. nuking it.', this.id(), this.cid());
			persona.unset('pubkey');
			persona.unset('privkey');
			persona.generate_ecc_key();
			persona.save();
		}.bind(this));
		this.trigger('change:pubkey');
	},

	destroy_persona: function(options)
	{
		// in addition to destroying the persona, we need to UNset all board
		// priv entries that contain this persona.
		turtl.profile.get('boards').each(function(board) {
			var privs = Object.clone(board.get('privs', {}));
			var shared = privs[this.id()];
			if(!shared) return;

			delete privs[this.id()];
			board.set({privs: privs});

			if(window.port) window.port.send('persona-deleted', this.id());
		}.bind(this));
		return this.destroy(options);
	},

	get_by_email: function(email, options)
	{
		options || (options = {});
		var args = {};

		// this prevents a persona from returning from the call if it is already
		// the owner of the email
		if(options.ignore_this_persona && this.id(true))
		{
			args.ignore_persona_id = this.id(true);
		}
		if(options.require_pubkey)
		{
			args.require_key = 1;
		}
		turtl.api.get('/personas/email/'+email, args, options);
	},

	search_by_email: function(email, options)
	{
		options || (options = {});

		turtl.api.get('/personas/email/'+email+'*', {}, options);
	},

	get_messages: function(options)
	{
		options || (options = {});
		if(!options.after)
		{
			var last = turtl.messages.models().filter(function() { return true; }).sort(function(a, b) {
				return a.id().localeCompare(b.id());
			})[0];
			if(last) options.after = last.id();
		}

		return turtl.api.get('/messages/personas/'+this.id(), {after: options.after}).bind(this)
			.then(function(res) {
				res.received.each(function(msgdata) {
					// if we already have this message, don't bother with all
					// the crypto stuff
					if(turtl.messages.find_by_id(msgdata.id)) return;
					var msg = new Message();
					msg.private_key = this.get('privkey');
					msg.set(msgdata);
					turtl.messages.add(msg);
				}.bind(this));
				return res;
			});
	},

	send_message: function(message, options)
	{
		options || (options = {});
		return message.save();
	},

	delete_message: function(message, options)
	{
		options || (options = {});
		return message.destroy({args: {persona: this.id() }});
	},

	generate_ecc_key: function(options)
	{
		options || (options = {});

		if(this.has_keypair({check_private: true}))
		{
			return true;
		}

		var keys = tcrypt.asym.generate_ecc_keys();
		this.set({pubkey: keys.public, privkey: keys.private});
		return true;
	},

	has_keypair: function(options)
	{
		options || (options = {});
		var has_key = this.get('pubkey') && true;
		if(options.check_private) has_key = has_key && this.get('privkey') && true;
		return has_key;
	},

	toJSON: function()
	{
		var privkey = this.get('privkey');
		if(privkey && typeof(privkey != 'string'))
		{
			this.data.privkey = tcrypt.to_base64(privkey);
		}
		var data = this.parent.apply(this, arguments);
		this.data.privkey = privkey;

		var pubkey = this.get('pubkey');
		if(pubkey && typeof(pubkey != 'string'))
		{
			pubkey = tcrypt.to_base64(pubkey);
		}
		data.pubkey = pubkey;
		return data;
	},

	set: function(data, options)
	{
		if(data)
		{
			if(data.pubkey && typeof(data.pubkey) == 'string')
			{
				try
				{
					data.pubkey = tcrypt.from_base64(data.pubkey);
				}
				catch(e)
				{
					// this is probably an old key (RSA). nuke it.
					data.pubkey = null;
				}
			}
			if(data.privkey && typeof(data.privkey) == 'string')
			{
				try
				{
					data.privkey = tcrypt.from_base64(data.privkey);
				}
				catch(e)
				{
					data.privkey = null;
				}
			}
		}
		return this.parent.apply(this, arguments);
	}

	/*
	// TODO: promisify if enabled
	generate_rsa_key: function(options)
	{
		options || (options = {});

		if(this.has_keypair({check_private: true}))
		{
			if(options.success) options.success();
			return;
		}

		if(window.port) window.port.send('rsa-keygen-start', this.id());
		this.set({generating_key: true});
		tcrypt.generate_rsa_keypair({
			success: function(rsakey) {
				this.unset('generating_key');
				this.set_rsa(rsakey);
				this.save();
				if(window.port) window.port.send('rsa-keygen-finish', this.id());
				if(options.success) options.success();
			}.bind(this),
			error: function(err) {
				this.unset('generating_key');
				if(window.port) window.port.send('rsa-keygen-error', err, this.id());
				if(options.error) options.error(err);
			}.bind(this)
		});

	},

	set_rsa: function(rsakey, options)
	{
		options || (options = {});

		var split = tcrypt.split_rsa_key(rsakey);
		this.set({
			pubkey: tcrypt.rsa_key_to_json(split.public),
			privkey: tcrypt.rsa_key_to_json(split.private)
		});
	},
	*/
});

var Personas = SyncCollection.extend({
	model: Persona,
	local_table: 'personas'
});

var PersonasFilter = Composer.FilterCollection.extend({
});

