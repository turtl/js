var User	=	Composer.RelationalModel.extend({
	base_url: '/users',

	relations: {
		personas: {
			type: Composer.HasMany,
			filter_collection: 'PersonasFilter',
			master: function() { return turtl.profile.get('personas'); },
			options: {
				filter: function(p) {
					return p.get('user_id') == turtl.user.id();
				}
			},
			forward_events: true,
			delayed_init: true
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

	key: null,
	auth: null,

	settings_timer: null,

	init: function()
	{
		this.logged_in		=	false;

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

	login_from_auth: function(auth)
	{
		if(!auth) return false;
		this.set({id: auth.uid});
		this.auth		=	auth.auth;
		this.key		=	tcrypt.key_to_bin(auth.key);
		this.logged_in	=	true;
		this.trigger('login', this);
	},

	login_from_cookie: function()
	{
		var cookie	=	Cookie.read(config.user_cookie);
		if(cookie == null)
		{
			return false;
		}
		var userdata	=	JSON.decode(cookie);
		var key			=	tcrypt.key_to_bin(userdata.k);
		var auth		=	userdata.a;
		delete userdata.k;
		delete userdata.a;
		this.key	=	key;
		this.auth	=	auth;
		this.set(userdata);
		this.logged_in	=	true;
		this.trigger('login', this);
	},

	join: function(options)
	{
		options || (options = {});
		turtl.api.post('/users', {data: {a: this.get_auth()}}, {
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
			k: tcrypt.key_to_string(key),
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
		//turtl.profile.persist({now: true});
	},

	get_key: function()
	{
		var key = this.key;
		if(key) return key;

		var username = this.get('username');
		var password = this.get('password');

		if(!username || !password) return false;

		// TODO: abstract key generation a bit better (iterations/keysize mainly)
		var key = tcrypt.key(password, username + ':a_pinch_of_salt', {key_size: 32, iterations: 400});

		// cache it
		this.key = key;

		return key;
	},

	get_auth: function()
	{
		if(this.auth) return this.auth;

		var username = this.get('username');
		var password = this.get('password');

		if(!username || !password) return false;

		var user_record = tcrypt.hash(password) +':'+ username;
		// use username as salt/initial vector
		var key	=	this.get_key();
		var iv	=	tcrypt.iv(username+'4c281987249be78a');	// make sure IV always has 16 bytes

		// note we serialize with version 0 (the original Turtl serialization
		// format) for backwards compat
		var auth	=	tcrypt.encrypt(key, user_record, {iv: iv, version: 0}).toString();

		// save auth
		this.auth	=	auth;

		return auth;
	},

	test_auth: function(options)
	{
		options || (options = {});
		turtl.api.set_auth(this.get_auth());
		turtl.api.post('/auth', {}, {
			success: options.success,
			error: options.error
		});
		turtl.api.clear_auth();
	},

	add_user_key: function(item_id, key)
	{
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

