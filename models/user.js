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

	settings_timer: null,

	init: function()
	{
		this.logged_in		=	false;

		// add new personas to user settings (where the shared secret is stored)
		this.bind_relational('personas', ['saved'], function() {
			var persona_settings	=	this.get('settings').get_by_key('personas');
			var personas = {};
			this.get('personas').each(function(persona) {
				personas[persona.id()] = persona.get('secret');
			});
			persona_settings.value(personas);
		}.bind(this), 'user:track_personas');

		// make sure personas that are deleted are removed from user settings
		this.bind_relational('personas', ['destroy'], function(persona) {
			var persona_settings	=	this.get('settings').get_by_key('personas');
			var personas = Object.clone(persona_settings.value());
			delete personas[persona.id()];
			persona_settings.value(personas);
		}.bind(this), 'user:track_personas:destroy');

		// used to throttle user settings saves
		this.settings_timer		=	new Timer(10, 10);
		this.settings_timer.end	=	this.save_settings.bind(this);

		// whenever the user settings change, automatically save them (encrypted).
		// however, sometimes many settings will change at once, and instead of
		// stupidly doing a save for each successive change, we have a timer that
		// waits a set time before saving. if any more settings change happen in
		// that time, the timer is reset.
		this.bind_relational('settings', ['change'], function() {
			this.settings_timer.reset();
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
			last_board: this.get('last_board')
		};
		Cookie.write(config.user_cookie, JSON.encode(save), { duration: duration });
	},

	logout: function()
	{
		this.auth = null;
		this.key = null;
		this.logged_in	=	false;
		this.clear();
		Cookie.dispose(config.user_cookie);
		this.unbind_relational('personas', ['saved'], 'user:track_personas');
		this.unbind_relational('personas', ['destroy'], 'user:track_personas:destroy');
		this.unbind_relational('settings', ['change'], 'user:save_settings');

		// clear user data
		this.get('personas').each(function(p) {
			p.unbind();
			p.destroy({silent: true, skip_sync: true});
		});
		this.get('personas').unbind().clear();
		this.get('settings').unbind().clear();
		this.trigger('logout', this);
	},

	save_settings: function()
	{
		this.save({
			success: function(res) {
				this.trigger('saved', res);
			}.bind(this),
			error: function(model, err) {
				barfr.barf('There was an error saving your user settings:'+ err);
			}.bind(this)
		});
	},

	get_key: function()
	{
		var key = this.key;
		if(key) return key;

		var username = this.get('username');
		var password = this.get('password');

		if(!username || !password) return false;

		// TODO: abstract key generation a bit better (iterations/keysize mainly)
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
		var iv = tcrypt.iv(username+'4c281987249be78a');	// make sure IV always has 16 bytes
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
			num_reqs++;
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
	},

	add_user_key: function(item_id, key)
	{
		console.log('user: add_key: ', item_id, key);
		if(!item_id || !key) return false;
		var user_keys		=	Object.clone(this.get('settings').get_by_key('keys').value()) || {};
		user_keys[item_id]	=	tcrypt.key_to_string(key);
		this.get('settings').get_by_key('keys').value(user_keys);
	},

	remove_user_key: function(item_id)
	{
		if(!item_id) return false;
		var user_keys	=	Object.clone(this.get('settings').get_by_key('keys').value()) || {};
		delete user_keys[item_id];
		this.get('settings').get_by_key('keys').value(user_keys);
	},

	find_user_key: function(item_id)
	{
		if(!item_id) return false;
		var user_keys	=	Object.clone(this.get('settings').get_by_key('keys').value()) || {};
		var key			=	user_keys[item_id];
		if(!key) return false;
		return tcrypt.key_to_bin(key);
	}
}, Protected);

