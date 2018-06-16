var UserMigrateController = UserJoinController.extend({
	xdom: true,

	elements: {
		'input[name=v6_username]': 'inp_v6_username',
		'input[name=v6_password]': 'inp_v6_password',
		'input[name=username]': 'inp_username',
		'input[name=password]': 'inp_password',
		'input[name=confirm]': 'inp_confirm',
		'input[name=old_server]': 'inp_old_server',
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
	formclass: 'user-migrate',

	viewstate: {
		username: '',
		password: '',
		old_endpoint: '',
		endpoint: '',
		strength_text: ' - ',
		strength_width: 0,
		strength_class: '',
		settings: false,
	},

	init: function() {
		this.parent();

		turtl.push_title(i18next.t('Migrate your account'), '/users/login');
		this.bind('release', turtl.pop_title.bind(null, false));

		var rendered = false;
		this.bind_once('xdom:render', function() { rendered = true; });
		this.with_bind_once(turtl.events, 'user:migrate:login', function(username, password) {
			var set_vals = function() {
				this.inp_v6_username.set('value', username);
				this.inp_v6_password.set('value', password);
				if(username.match(/@/)) {
					this.inp_username.set('value', username);
				}
			}.bind(this);
			if(rendered) {
				set_vals();
			} else {
				this.bind_once('xdom:render', set_vals);
			}
		}.bind(this));
	},

	render: function() {
		return this.html(view.render('users/migrate', {
			state: this.viewstate,
			autologin: this.autologin(),
		}));
	},

	submit: function(e) {
		if(e) e.stop();

		var v6_username = this.inp_v6_username.get('value');
		var v6_password = this.inp_v6_password.get('value');
		var username = this.inp_username.get('value');
		var password = this.inp_password.get('value');

		var errors = this.check_login(this.inp_username, this.inp_password, this.inp_confirm);
		if(!this.check_errors(errors)) return;

		this.inp_submit.disabled = true;
		var old_server = this.inp_old_server.get('value').trim();
		var server = this.inp_server.get('value').trim();
		var endpoint_promise = this.persist_endpoint(server, old_server);

		this.el_loader.addClass('active');
		this.inp_submit.set('disabled', 'disabled');
		turtl.loading(true);

		endpoint_promise
			.bind(this)
			.then(function() {
				barfr.barf(i18next.t('Migration started. This can take a few minutes! Please be patient.'));
				return turtl.user.migrate(v6_username, v6_password, username, password);
			})
			.then(function() {
				turtl.settings.set('last_username', username);
			})
			.then(this.save_login.bind(this))
			.catch(function(err) {
				turtl.events.trigger('ui-error', i18next.t('There was a problem saving that account'), err);
				log.error('users: migrate: ', err, derr(err));
			})
			.finally(function() {
				turtl.loading(false);
				this.inp_submit.set('disabled', '');
				this.el_loader.removeClass('active');
			});
	},
});

