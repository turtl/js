var UserLoginController = FormController.extend({
	elements: {
		'input[name=username]': 'inp_username',
		'input[name=password]': 'inp_password',
		'input[name=server]': 'inp_server',
		'input[type=submit]': 'inp_submit',
		'p.load': 'el_loader',
		'a.open-settings': 'el_open_settings',
		'p.settings': 'el_settings'
	},

	events: {
		'click a.open-settings': 'toggle_settings'
	},

	buttons: false,
	formclass: 'user-login',

	init: function()
	{
		this.parent();
		turtl.push_title('Login');
		this.bind('release', turtl.pop_title.bind(null, false));
		this.render();
	},

	render: function()
	{
		var content = view.render('users/login', {
			server: config.api_url
		});
		this.html(content);
		(function() { this.inp_username.focus(); }).delay(10, this);

		this.el_settings.set('slide', {duration: 300});
		this.el_settings.get('slide').hide();
	},

	submit: function(e)
	{
		if(e) e.stop();

		var server = this.inp_server.get('value').trim();
		if(server)
		{
			server = server.replace(/\/+$/, '');
			if(server != config.api_url)
			{
				log.debug('user: persisting api url');
				config.api_url = server;
				turtl.api.api_url = server;
				// persist it
				localStorage.config_api_url = config.api_url;
			}
		}

		var username = this.inp_username.get('value');
		var password = this.inp_password.get('value');
		var user = new User({
			username: username,
			password: password
		});

		this.el_loader.addClass('active');
		this.inp_submit.set('disabled', 'disabled');
		turtl.loading(true);
		user.test_auth().bind(this)
			.spread(function(id, meta) {
				var data = user.toJSON();
				data.id = id;
				turtl.user.set({
					username: user.get('username'),
					password: user.get('password')
				});
				turtl.user.login(data, {old: meta.old});
				if(meta.old)
				{
					barfr.barf('Your master key was generated using an older method. To upgrade it, please go to the "Change password" section of your account settings under the Turtl menu.');
				}
			})
			.catch(function(err) {
				this.inp_submit.set('disabled', '');
				if(err && err.xhr && err.xhr.status === 0)
				{
					barfr.barf('Couldn\'t connect to the server');
					return;
				}
				barfr.barf('Login failed.');
				log.error('login error: ', derr(err));
			})
			.finally(function() {
				turtl.loading(false);
				this.el_loader.removeClass('active');
			});
	},

	toggle_settings: function(e)
	{
		if(e) e.stop();

		if(this.el_open_settings.hasClass('active'))
		{
			this.el_open_settings.removeClass('active');
			this.el_settings.slide('out');
		}
		else
		{
			this.el_open_settings.addClass('active');
			this.el_settings.slide('in');
		}
	}
});

