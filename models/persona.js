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
			var upersonas = turtl.user.get('personas');
			if(!upersonas) return false;
			if(this.get('user_id') != turtl.user.id()) return false;
			var persona = upersonas.find_by_id(this.id());
			if(!persona || persona.has_keypair()) return false;

			if(!this.generating)
			{
				log.warn('persona: old (or missing) RSA key detected. nuking it.', this.id(), this.cid());
				persona.unset('pubkey');
				persona.unset('privkey');
				persona.generate_key().bind(this)
					.then(function(prog) {
						if(prog && prog.in_progress) return;
						return persona.save();
					})
					.catch(function(err) {
						turtl.events.trigger('ui-error', 'There was a problem upgrading your persona key. Please go to your persona settings and generate a key.', err);
						log.error('persona: edit: ', this.id(), derr(err));
					});
			}
		}.bind(this));
		this.trigger('change:pubkey');
	},

	init_new: function(options)
	{
		options || (options = {});

		// we just use the current user's key. simple.
		this.set({user_id: turtl.user.id()}, options);
		this.key = turtl.user.key;
		keypromise = Promise.resolve();
		return keypromise;
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

	has_keypair: function()
	{
		var pubkey = this.get('pubkey');
		var privkey = this.get('privkey');
		var is_pgp = !!(pubkey && pubkey.match(/^-----BEGIN PGP/));
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

var PersonasFilter = Composer.FilterCollection.extend({});

