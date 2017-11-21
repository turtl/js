var UserLoginController = UserBaseController.extend({
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

		turtl.push_title(i18next.t('Login'));
		this.bind('release', turtl.pop_title.bind(null, false));
		this.render();
	},

	render: function()
	{
		var last_username = turtl.settings.get('last_username');
		var content = view.render('users/login', {
			server: config.api_url,
			autologin: this.autologin(),
			show_autologin: config.has_autologin,
			last_username: last_username,
		});
		this.html(content);
		(function() {
			if(last_username) {
				this.inp_password.focus();
			} else {
				this.inp_username.focus();
			}
		}).delay(10, this);

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
		turtl.user.login(username, password)
			.bind(this)
			.then(function() {
				turtl.settings.set('last_username', user.get('username'));
			})
			.then(this.save_login.bind(this))
			.catch(function(err) {
				this.inp_submit.set('disabled', '');
				barfr.barf(i18next.t('Login failed'));
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

