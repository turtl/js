var UserMigrateController = UserJoinController.extend({
	xdom: true,

	elements: {
		'input[name=v6_username]': 'inp_v6_username',
		'input[name=v6_password]': 'inp_v6_password',
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
		var advanced = view.render('users/advanced-settings', {
			state: this.viewstate,
			show_old_server: true,
		});
		return this.html(view.render('users/migrate', {
			state: this.viewstate,
			autologin: this.autologin(),
			advanced: advanced,
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
		var endpoint_promise = this.persist_login_settings(this.grab_form_login_settings());

		this.el_loader.addClass('active');
		this.inp_submit.set('disabled', 'disabled');
		turtl.loading(true);

		var migration_errors = [];
		var decrypted_items = 0;
		var total_items = 0;
		this.with_bind(turtl.events, 'migration', function(ev, args) {
			switch(ev) {
				case 'error':
					if(migration_errors.length < 3 && (args.subtype == 'keychain' || args.subtype == 'board')) {
						turtl.update_loading_screen(i18next.t('Migration error...'));
					}
					migration_errors.push(args);
					break;
				case 'profile-items':
					turtl.update_loading_screen(i18next.t('Grabbed {{num_keychain}} keychain entries, {{num_boards}} boards, {{num_notes}} notes, {{num_files}} files from old server', args));
					turtl.update_loading_screen(i18next.t('Downloading files...'));
					total_items = args.num_keychain + args.num_boards + args.num_notes + args.num_files;
					break;
				case 'decrypt-start':
					turtl.update_loading_screen(i18next.t('Files downloaded, decrypting profile...'));
					break;
				case 'decrypt-done':
					turtl.update_loading_screen(i18next.t('Old profile loaded, converting to new format...', args));
					break;
				case 'decrypt-item':
					decrypted_items++;
					if(decrypted_items % (Math.floor(total_items / 4)) == 0) {
						turtl.update_loading_screen(i18next.t('Decrypted {{percent}} of items', {percent: Math.round(100 * (decrypted_items / total_items))+'%'}));
					}
					break;
			}
		}, 'migration:overlay:listener');
		turtl.update_loading_screen(false);
		endpoint_promise
			.bind(this)
			.then(function() {
				barfr.barf(i18next.t('Migration started. This can take a few minutes! Please be patient.'));
				turtl.show_loading_screen(true);
				return turtl.user.migrate(v6_username, v6_password, username, password);
			})
			.then(function() {
				turtl.settings.set('last_username', username);
				var keychain_errors = migration_errors
					.filter(function(e) { return e.subtype == 'keychain' || e.subtype == 'board'; });
				if(keychain_errors.length > 0) {
					new UserMigrationReportController({
						errors: migration_errors,
					});
				}
			})
			.then(this.save_login.bind(this))
			.catch(function(err) {
				turtl.events.trigger('ui-error', i18next.t('There was a problem migrating that account'), err);
				log.error('users: migrate: ', err, derr(err));
			})
			.finally(function() {
				turtl.loading(false);
				turtl.show_loading_screen(false);
				turtl.update_loading_screen(false);
				this.inp_submit.set('disabled', '');
				this.el_loader.removeClass('active');
			});
	},
});

