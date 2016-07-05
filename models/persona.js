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

	// if we're generating a key, returns true
	generating: false,

	// automatically upgrade keys from ECC -> PGP
	auto_upgrade_key: true,

	initialize: function(data)
	{
		// steal user's key for this persona
		if(turtl.user.logged_in && data && data.user_id == turtl.user.id())
		{
			this.key = turtl.user.key;
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

		if(this.auto_upgrade_key)
		{
			this.bind('change:privkey', function() {
				if(this.get('user_id') != turtl.user.id()) return false;
				if(this.has_keypair()) return false;
				var persona = this;

				(function() {
					if(!this.generating)
					{
						log.warn('persona: old (or missing) key detected. nuking it.', persona.id(), persona.cid());
						persona.unset('pubkey');
						persona.unset('privkey');
						persona.generate_key().bind(this)
							.then(function(prog) {
								if(prog && prog.in_progress) return;
								log.warn('persona: key upgraded');
								return persona.save();
							})
							.catch(function(err) {
								turtl.events.trigger('ui-error', i18next.t('There was a problem upgrading your persona key. Please go to your persona settings and generate a key.'), err);
								log.error('persona: edit: ', persona.id(), derr(err));
							});
					}
				}).delay(0, this);
			}.bind(this));
			this.trigger('change:pubkey');
		}
	},

	create_or_ensure_key: function()
	{
		this.key = turtl.user.key;
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
		return turtl.api.get('/personas/email/'+encodeURIComponent(email), args, options).bind(this)
			.then(function(data) {
				if(!this.key_is_pgp(data.pubkey))
				{
					var err = new Error('Persona has invalid key')
					err.outdated_key = true;
					throw err;
				}
				return new Persona(data);
			});
	},

	key_is_pgp: function(key)
	{
		var is_pgp = !!(key && key.match(/^-----BEGIN PGP/));
		return is_pgp;
	},

	has_keypair: function()
	{
		var pubkey = this.get('pubkey');
		var privkey = this.get('privkey');
		var is_pgp = this.key_is_pgp(pubkey);
		return is_pgp && pubkey && privkey && true;
	},

	generate_key: function()
	{
		if(this.generating) return Promise.resolve({in_progress: true});

		this.set({generating: true});
		this.generating = true;
		return tcrypt.asym.keygen({user_id: this.get('email')}).bind(this)
			.tap(function(keys) {
				this.set({
					pubkey: keys.public,
					privkey: keys.private,
					generating: false
				});
				this.generating = false;
			});
	}
});

var Personas = SyncCollection.extend({
	model: Persona
});

// don't upgrade keys for board personas since we likely don't own them =]
var BoardPersona = Persona.extend({
	auto_upgrade_key: false,

	// deserializing boards will try to recursively deserialize related objects.
	// we don't want personas being deserialized because we don't have their
	// keys, so we create a dummy function here that just returns the public
	// data.
	deserialize: function()
	{
		return Promise.resolve(this.toJSON());
	}
});
var BoardPersonas = SyncCollection.extend({ model: BoardPersona });

