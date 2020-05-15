var UserLoginController = UserBaseController.extend({
	xdom: true,

	elements: {
		'input[name=username]': 'inp_username',
		'input[name=password]': 'inp_password',
		'input[type=submit]': 'inp_submit',
		'p.load': 'el_loader',
		'a.open-settings': 'el_open_settings',
		'p.settings': 'el_settings'
	},

	events: {
	},

	buttons: false,
	formclass: 'user-login',
	disable_browser_validation: true,

	viewstate: {
		old_endpoint: '',
		endpoint: '',
		proxy: '',
		last_username: '',
		settings: false,
	},

	init: function()
	{
		this.parent();

		turtl.push_title(i18next.t('Login'));
		this.bind('release', turtl.pop_title.bind(null, false));

		var header_actions = [];
		header_actions.push({name: 'menu', actions: [
			{name: i18next.t('Debug log'), href: '/settings/logs', rel: 'debug-log'},
		]});
		turtl.events.trigger('header:set-actions', header_actions);
		this.with_bind(turtl.events, 'header:menu:fire-action', function(action, atag) {
			turtl.back.push(turtl.route.bind(turtl, turtl.router.cur_path()));
			turtl.route(atag.get('href'));
		}.bind(this));

		this.populate_login_settings()
			.bind(this)
			.then(function(settings) {
				Object.assign(this.viewstate, settings);
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
		var advanced = view.render('users/advanced-settings', {
			state: this.viewstate,
			show_old_server: true,
		});
		return this.html(view.render('users/login', {
			state: this.viewstate,
			autologin: this.autologin(),
			advanced: advanced,
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

		var endpoint_promise = this.persist_login_settings(this.grab_form_login_settings());

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
			.catch(function(e) { return e.type == 'api' && e.subtype == 'Forbidden'; }, function(err) {
				// login failed, let's see if it's a v0.6 login...
				return turtl.user.can_migrate(username, password)
					.then(function(can) {
						if(!can) throw err;
						turtl.route('/users/migrate');
						setTimeout(function() {
							turtl.events.trigger('user:migrate:login', username, password);
						}, 100);
					});
			})
			.catch(function(err) {
				this.inp_submit.set('disabled', '');
				barfr.barf(i18next.t('Login failed')+' -- '+derr(err));
				log.error('login error: ', derr(err));
			})
			.finally(function() {
				turtl.loading(false);
				this.el_loader.removeClass('active');
				this.inp_submit.set('disabled', '');
			});
	},
});

