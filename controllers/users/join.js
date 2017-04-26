var UserJoinController = UserBaseController.extend({
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
		'p.settings': 'el_settings'
	},

	events: {
		'click .button.confirm': 'finalize',
		'input input[name=password]': 'update_meter',
		'click a.open-settings': 'toggle_settings'
	},

	buttons: false,
	formclass: 'user-join',

	init: function()
	{
		this.parent();

		turtl.push_title(i18next.t('Join'), '/users/login');
		this.bind('release', turtl.pop_title.bind(null, false));

		this.render();
	},

	render: function()
	{
		var content = view.render('users/join', {
			server: config.api_url,
			autologin: this.autologin(),
			show_autologin: config.has_autologin,
		});
		this.html(content);
		(function() { this.inp_username.focus(); }).delay(100, this);
		this.update_meter();

		this.el_settings.set('slide', {duration: 300});
		this.el_settings.get('slide').hide();
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
		var pconfirm = this.inp_confirm.get('value');

		var errors = this.check_login(this.inp_username, this.inp_password, this.inp_confirm);
		if(!this.check_errors(errors)) return;

		this.inp_submit.disabled = true;

		var user = new User({
			username: username,
			password: password,
		});

		this.el_loader.addClass('active');
		this.inp_submit.set('disabled', 'disabled');
		turtl.loading(true);
		user.join().bind(this)
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

	create_initial_profile: function()
	{
		var add_space = function(data)
		{
			var space = new Space(data);
			space.create_or_ensure_key({silent: true});
			return space.save()
				.then(function() {
					turtl.profile.get('spaces').upsert(space);
					return space;
				});
		};
		var add_board = function(space_id, name)
		{
			var board = new Board({space_id: space_id, title: name});
			board.create_or_ensure_key({silent: true});
			return board.save()
				.then(function() {
					turtl.profile.get('boards').upsert(board);
					return board;
				});
		};
		var personal_space_id = null;
		return add_space({title: i18next.t('Personal'), color: '#408080'})
			.then(function(space) {
				personal_space_id = space.id();
				return add_space({title: i18next.t('Work'), color: '#439645'});
			})
			.then(function(space) {
				return add_space({title: i18next.t('Home'), color: '#800000'});
			})
			.then(function(space) {
				return add_board(personal_space_id, i18next.t('Bookmarks'));
			})
			.then(function() {
				return add_board(personal_space_id, i18next.t('Photos'))
			})
			.then(function() {
				return add_board(personal_space_id, i18next.t('Passwords'));
			})
			.catch(function(err) {
				turtl.events.trigger('ui-error', i18next.t('There was a problem creating your initial boards'), err);
				log.error('users: join: initial boards: ', derr(err));
			});
	},

	update_meter: function(e)
	{
		var passphrase = this.inp_password.get('value');
		var status = ' - ';
		if(passphrase.length >= 32)
		{
			status = i18next.t('excellent');
		}
		else if(passphrase.length >= 24)
		{
			status = i18next.t('great');
		}
		else if(passphrase.length >= 16)
		{
			status = i18next.t('good');
		}
		else if(passphrase.length >= 10)
		{
			status = i18next.t('ok');
		}
		else if(passphrase.length > 4)
		{
			status = i18next.t('weak');
		}
		else if(passphrase.length > 0)
		{
			status = i18next.t('too short');
		}

		var width = Math.min(passphrase.length / 32, 1) * 100;

		this.strength_status.set('html', status);
		this.strength_bar.setStyles({width: width + '%'});
		this.strength_container.className = this.strength_container.className.replace(/level-.*( |$)/, '');
		this.strength_container.addClass('level-'+sluggify(status));
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

