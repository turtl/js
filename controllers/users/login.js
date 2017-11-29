var UserLoginController = UserBaseController.extend({
	xdom: true,

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

	viewstate: {
		endpoint: '',
		last_username: '',
		settings: false,
	},

	init: function()
	{
		this.parent();

		turtl.push_title(i18next.t('Login'));
		this.bind('release', turtl.pop_title.bind(null, false));

		App.prototype.get_api_endpoint()
			.bind(this)
			.then(function(endpoint) {
				this.viewstate.last_username = turtl.settings.get('last_username');
				this.viewstate.endpoint = localStorage.config_api_url || endpoint;
			})
			.then(this.render.bind(this))
			.then(function() {
				(function() {
					if(this.viewstate.last_username) {
						this.inp_password.focus();
					} else {
						this.inp_username.focus();
					}
				}).delay(10, this);
			});
	},

	render: function()
	{
		return this.html(view.render('users/login', {
			state: this.viewstate,
			autologin: this.autologin(),
			show_autologin: config.has_autologin,
		}));
	},

	submit: function(e)
	{
		if(e) e.stop();

		var username = this.inp_username.get('value');
		var password = this.inp_password.get('value');
		var user = new User({
			username: username,
			password: password
		});

		var server = this.inp_server.get('value').trim();
		var endpoint_promise = this.persist_endpoint(server);

		this.el_loader.addClass('active');
		this.inp_submit.set('disabled', 'disabled');
		turtl.loading(true);
		endpoint_promise
			.bind(this)
			.then(function() {
				return turtl.user.login(username, password);
			})
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

		this.viewstate.settings = !this.viewstate.settings;
		this.render();
	}
});

