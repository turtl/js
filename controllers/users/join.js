var UserJoinController = UserBaseController.extend({
	xdom: true,
	elements: {
		'input[name=username]': 'inp_username',
		'input[name=password]': 'inp_password',
		'input[name=confirm]': 'inp_confirm',
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
	},

	buttons: false,
	formclass: 'user-join',

	viewstate: {
		endpoint: '',
		proxy: '',
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

		this.populate_login_settings()
			.bind(this)
			.then(function(settings) {
				Object.assign(this.viewstate, settings);
			})
			.then(this.render.bind(this))
			.then(function() {
				(function() { this.inp_username.focus(); }).delay(100, this);
			});
	},

	render: function()
	{
		var advanced = view.render('users/advanced-settings', {
			state: this.viewstate,
		});
		return this.html(view.render('users/join', {
			state: this.viewstate,
			autologin: this.autologin(),
			advanced: advanced,
		}));
	},

	check_login: function(inp_username, inp_password, inp_pconfirm)
	{
		var password = inp_password.get('value');
		var pconfirm = inp_pconfirm.get('value');

		var errors = [];
		if(password != pconfirm)
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

		var errors = this.check_login(this.inp_username, this.inp_password, this.inp_confirm);
		if(!this.check_errors(errors)) return;

		var endpoint_promise = this.persist_login_settings(this.grab_form_login_settings());

		this.el_loader.addClass('active');
		this.inp_submit.set('disabled', 'disabled');
		turtl.loading(true);
		endpoint_promise
			.bind(this)
			.then(function() {
				return turtl.user.join(username, password);
			})
			.then(function() {
				turtl.settings.set('last_username', username);
			})
			.then(this.save_login.bind(this))
			.catch(function(err) {
				turtl.events.trigger('ui-error', i18next.t('There was a problem saving that account'), err);
				log.error('users: join: ', err, derr(err));
			})
			.finally(function() {
				turtl.loading(false);
				this.inp_submit.set('disabled', '');
				this.el_loader.removeClass('active');
			});
	},

	update_meter: function(e)
	{
		var passphrase = this.inp_password.get('value');
		var status = ' - ';
		var text = '';
		// NOTE: we actually want i18next('stringval') here instead of
		// i18next(status) because by using hardcoded strings, we can analyze
		// the code and find a list of active i18n strings, which could be used
		// to generate an automated list of translations that are needed. this
		// is especially important for when the interface language  changes.
		if(passphrase.length >= 32) {
			status = 'excellent';
			text = i18next.t('excellent');
		} else if(passphrase.length >= 24) {
			status = 'great';
			text = i18next.t('great');
		} else if(passphrase.length >= 16) {
			status = 'good';
			text = i18next.t('good');
		} else if(passphrase.length >= 10) {
			status = 'ok';
			text = i18next.t('ok');
		} else if(passphrase.length > 4) {
			status = 'weak';
			text = i18next.t('weak');
		} else if(passphrase.length > 0) {
			status = 'too short';
			text = i18next.t('too short');
		}

		var width = Math.min(passphrase.length / 32, 1) * 100;

		this.viewstate.strength_text = text;
		this.viewstate.strength_width = width;
		this.viewstate.strength_class = 'level-'+sluggify(status);
		this.render();
	},
});

