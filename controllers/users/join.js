var UserJoinController = UserBaseController.extend({
	xdom: true,
	elements: {
		'input[name=username]': 'inp_username',
		'input[name=password]': 'inp_password',
		'input[name=confirm]': 'inp_confirm',
		'input[name=server]': 'inp_server',
		'input[type=submit]': 'inp_submit',
		'p.load': 'el_loader',
		'.strength': 'strength_container',
		'.strength .inner': 'strength_bar',
		'.strength .status': 'strength_status',
		'a.open-settings': 'el_open_settings',
	},

	events: {
		'click .button.confirm': 'finalize',
		'input input[name=password]': 'update_meter',
		'click a.open-settings': 'toggle_settings'
	},

	buttons: false,
	formclass: 'user-join',

	viewstate: {
		endpoint: '',
		strength_text: ' - ',
		strength_width: 0,
		strength_class: '',
		settings: false,
	},

	init: function()
	{
		this.parent();

		turtl.push_title(i18next.t('Join'), '/users/login');
		this.bind('release', turtl.pop_title.bind(null, false));

		App.prototype.get_api_endpoint()
			.bind(this)
			.then(function(endpoint) {
				this.viewstate.endpoint = localStorage.config_api_url || endpoint;
			})
			.then(this.render.bind(this))
			.then(function() {
				(function() { this.inp_username.focus(); }).delay(100, this);
			});
	},

	render: function()
	{
		return this.html(view.render('users/join', {
			state: this.viewstate,
			autologin: this.autologin(),
			show_autologin: config.has_autologin,
		}));
	},

	check_login: function(inp_username, inp_password, inp_pconfirm)
	{
		var username = inp_username.get('value');
		var password = inp_password.get('value');
		var pconfirm = inp_pconfirm.get('value');

		var errors = [];
		if(username.length < 3)
		{
			errors.push([inp_username, i18next.t('Please enter a username 3 characters or longer.')]);
		}

		if(password.length == 0)
		{
			errors.push([inp_password, i18next.t('Please enter a passphrase. Hint: Sentences are much better than single words.')]);
		}
		else if(password.length < 4)
		{
			errors.push([inp_password, i18next.t('We don\'t mean to tell you your business, but a passphrase less than four characters won\'t cut it. Try again.')]);
		}
		else if(password != pconfirm)
		{
			errors.push([inp_pconfirm, i18next.t('Your passphrase does not match the confirmation.')]);
		}
		else if(password.toLowerCase() == 'password')
		{
			errors.push([inp_password, i18next.t('That passphrase is making me cringe.')]);
		}
		return errors;
	},

	submit: function(e)
	{
		if(e) e.stop();

		var username = this.inp_username.get('value');
		var password = this.inp_password.get('value');
		var pconfirm = this.inp_confirm.get('value');

		var errors = this.check_login(this.inp_username, this.inp_password, this.inp_confirm);
		if(!this.check_errors(errors)) return;

		this.inp_submit.disabled = true;

		var user = new User({
			username: username,
			password: password,
		});

		var server = this.inp_server.get('value').trim();
		var endpoint_promise = this.persist_endpoint(server);

		this.el_loader.addClass('active');
		this.inp_submit.set('disabled', 'disabled');
		turtl.loading(true);
		endpoint_promise
			.bind(this)
			.then(function() {
				return user.join();
			})
			.then(function(userdata) {
				var data = user.toJSON();
				data.id = userdata.id;
				return turtl.user.login(data)
					.then(this.save_login.bind(this));
			})
			.then(function() {
				turtl.events.bind_once('app:load:profile-loaded', function() {
					return this.create_initial_profile()
						.then(function() {
							turtl.route('/');
						});
				}.bind(this));
			})
			.catch(function(err) {
				this.inp_submit.disabled = false;
				if(err.disconnected)
				{
					barfr.barf(i18next.t('Couldn\'t connect to the server'));
					return;
				}
				turtl.events.trigger('ui-error', i18next.t('There was a problem saving that account'), err);
				log.error('users: join: ', err, derr(err));
				this.inp_submit.set('disabled', '');
			})
			.finally(function() {
				turtl.loading(false);
				this.el_loader.removeClass('active');
			});
	},

	update_meter: function(e)
	{
		var passphrase = this.inp_password.get('value');
		var status = ' - ';
		if(passphrase.length >= 32)
		{
			status = 'excellent';
		}
		else if(passphrase.length >= 24)
		{
			status = 'great';
		}
		else if(passphrase.length >= 16)
		{
			status = 'good';
		}
		else if(passphrase.length >= 10)
		{
			status = 'ok';
		}
		else if(passphrase.length > 4)
		{
			status = 'weak';
		}
		else if(passphrase.length > 0)
		{
			status = 'too short';
		}

		var width = Math.min(passphrase.length / 32, 1) * 100;

		this.viewstate.strength_text = i18next.t(status);
		this.viewstate.strength_width = width;
		this.viewstate.strength_class = 'level-'+sluggify(status);
		this.render();
	},

	toggle_settings: function(e)
	{
		if(e) e.stop();

		this.viewstate.settings = !this.viewstate.settings;
		this.render();
	}
});

