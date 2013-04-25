var User	=	Composer.Model.extend({
	type: 'user',

	base_url: '/users',

	logged_in: false,
	latest_feed: null,

	init: function()
	{
		this.logged_in		=	false;
		// TODO: REMOVE ME!!
		this.set({id: '516b9c503dc42c17a4000003'});
	},

	login: function(data, remember, silent)
	{
		(remember === true) || (remember = false);
		(silent === true) || (silent = false);
		this.set(data);
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
		this.set(JSON.decode(cookie));
		this.logged_in	=	true;
		this.trigger('login', this);
	},

	join: function(options)
	{
		options || (options = {});
		tagit.api.post('/users', {data: this.get_auth_key()}, {
			success: options.success,
			error: function(e) {
				barfr.barf('Error adding user! Please contact andrew@lyonbros.com.');
			}.bind(this)
		});
	},

	write_cookie: function(options)
	{
		options || (options = {});
		var duration	=	options.duration ? options.duration : 30;
		var userdata	=	this.toJSON();
		// delete userdata.social;	// JL NOTE ~ Need this or else social stuff is removed
		delete userdata.likes;
		delete userdata.following;
		Cookie.write(config.user_cookie, JSON.encode(userdata), { duration: duration });
	},

	logout: function()
	{
		this.logged_in	=	false;
		this.clear();
		Cookie.dispose(config.user_cookie);
		this.trigger('logout', this);
	},

	get_auth_key: function()
	{
		var username = this.get('username');
		var password = this.get('password');
		var user_record = username +':'+ tcrypt.hash(password);
		return tcrypt.encrypt(password, user_record).toString();
	},

	load_profile: function(options)
	{
		options || (options = {});
		var profile = this.get('profile', false);
		if(!profile)
		{
			profile = new Profile();
			this.set({ profile: profile });
		}
		profile.clear({silent: true});
		profile.load(options);
		return profile;
	},

	test_auth: function(email, pass, options)
	{
		options || (options = {});
		var cb_success	=	options.onSuccess ? options.onSuccess : function() {};
		var cb_fail		=	options.onFail ? options.onFail : function() {};

		musio.api.set_auth({
			email: email,
			password: pass
		});
		musio.api.get('/users/private/'+email, {}, {
			onSuccess: cb_success,
			onFail: cb_fail
		});

		// after testing it with this one request, clear it out. the sooner we get rid
		// of the cleartext p/w the better
		musio.api.clear_auth();
	}
});

var Users	=	Composer.Collection.extend({
	model: 'User'
});

