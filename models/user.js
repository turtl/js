var User	=	Composer.RelationalModel.extend({
	base_url: '/users',
	type: 'user',  // WTF is this for?

	relations: {
		personas: {
			type: Composer.HasMany,
			collection: 'Personas',
			forward_events: true
		},

		settings: {
			type: Composer.HasMany,
			collection: 'Settings',
			forward_events: true
		}
	},

	public_fields: [
		'id'
	],

	private_fields: [
		'settings'
	],

	logged_in: false,

	auth: null,
	key: null,

	init: function()
	{
		this.logged_in		=	false;

		this.bind_relational('personas', ['saved'], function() {
			var persona_settings	=	this.get('settings').get_by_key('personas');
			var personas = {};
			this.get('personas').each(function(persona) {
				personas[persona.id()] = persona.get('secret');
			});
			persona_settings.value(personas);
		}.bind(this), 'user:track_personas');

		this.bind_relational('settings', ['change'], function() {
			this.save({
				success: function(res) {
					this.trigger('saved', res);
				}.bind(this),
				error: function(model, err) {
					barfr.barf('There was an error saving your persona: '+ err);
				}.bind(this)
			});
		}.bind(this), 'user:save_settings');
	},

	login: function(data, remember, silent)
	{
		(remember === true) || (remember = false);
		(silent === true) || (silent = false);
		this.set(data);
		this.get_auth();
		this.unset('username');
		this.unset('password');
		this.logged_in	=	true;
		var duration	=	1;
		if(remember)
		{
			duration	=	30;
		}

		this.write_cookie({duration: duration});
		if (!silent) this.trigger('login', this);
	},

	login_from_cookie: function()
	{
		var cookie	=	Cookie.read(config.user_cookie);
		if(cookie == null)
		{
			return false;
		}
		var userdata	=	JSON.decode(cookie);
		var key			=	userdata.k;
		var auth		=	userdata.a;
		delete userdata.k;
		delete userdata.a;
		this.key	=	CryptoJS.enc.Hex.parse(key);
		this.auth	=	auth;
		this.set(userdata);
		this.logged_in	=	true;
		this.trigger('login', this);
	},

	join: function(options)
	{
		options || (options = {});
		tagit.api.post('/users', {data: {a: this.get_auth()}}, {
			success: options.success,
			error: function(e) {
				barfr.barf('Error adding user: '+ e);
				if(options.error) options.error(e);
			}.bind(this)
		});
	},

	write_cookie: function(options)
	{
		options || (options = {});
		var duration	=	options.duration ? options.duration : 30;
		var key			=	this.get_key();
		var auth		=	this.get_auth();
		if(!key || !auth) return false;

		var save		=	{
			id: this.id(),
			k: key.toString(),
			a: auth,
			last_project: this.get('last_project')
		};
		Cookie.write(config.user_cookie, JSON.encode(save), { duration: duration });
	},

	logout: function()
	{
		this.logged_in	=	false;
		this.clear();
		Cookie.dispose(config.user_cookie);
		this.trigger('logout', this);
	},

	get_key: function()
	{
		var key = this.key;
		if(key) return key;

		var username = this.get('username');
		var password = this.get('password');

		if(!username || !password) return false;

		var key = tcrypt.key(password, username + ':a_pinch_of_salt', {keySize: 256/32, iterations: 400});

		// cache it
		this.key = key;

		return key;
	},

	get_auth: function()
	{
		var auth = this.auth;
		if(auth) return auth;

		var username = this.get('username');
		var password = this.get('password');

		if(!username || !password) return false;

		var user_record = tcrypt.hash(password) +':'+ username;
		// use username as salt/initial vector
		var key = this.get_key();
		var iv = tcrypt.iv(username);
		var auth =  tcrypt.encrypt(key, user_record, {iv: iv}).toString();

		// cache it
		this.auth = auth;

		return auth;
	},

	load_profile: function(options)
	{
		options || (options = {});
		var profile = new Profile();
		profile.load_data(options);
		return profile;
	},

	load_personas: function(options)
	{
		var persona_keys = this.get('settings').get_by_key('personas').value();
		if(!persona_keys) return false;
		var num_reqs = 0;
		var target_reqs = Object.getLength(persona_keys);
		var finish = function(persona)
		{
			this.get('personas').add(persona);
			if(num_reqs >= target_reqs && options.success) options.success()
		}.bind(this);
		Object.each(persona_keys, function(secret, id) {
			var persona = new Persona({
				id: id,
				secret: secret
			});
			persona.key = this.get_key();	// assign user key to persona
			persona.fetch({ success: finish });
		}.bind(this));
	},

	test_auth: function(options)
	{
		options || (options = {});
		tagit.api.set_auth(this.get_auth());
		tagit.api.post('/auth', {}, {
			success: options.success,
			error: options.error
		});
		tagit.api.clear_auth();
	}
}, Protected);

