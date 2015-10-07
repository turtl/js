var ChangePasswordController = FormController.extend({
	elements: {
		'input[name=cur_username]': 'inp_cur_username',
		'input[name=cur_password]': 'inp_cur_password',
		'input[name=new_username]': 'inp_new_username',
		'input[name=new_password]': 'inp_new_password',
		'input[name=new_confirm]': 'inp_new_confirm',
		'input[type=submit]': 'inp_submit',
		'.buttons .button': 'el_loader'
	},

	events: {
		'submit form': 'save',
		'input input[name=cur_username]': 'match_username'
	},

	formclass: 'settings-password',
	buttons: false,

	init: function()
	{
		turtl.push_title('Change password', '/settings');

		this.parent();
		this.render();
	},

	render: function()
	{
		this.html(view.render('settings/password', {}));
		this.inp_cur_username.focus.delay(300, this.inp_cur_username);
	},

	save: function(e)
	{
		if(e) e.stop();
		var cur_username = this.inp_cur_username.get('value');
		var cur_password = this.inp_cur_password.get('value');
		var new_username = this.inp_new_username.get('value');
		var new_password = this.inp_new_password.get('value');
		var new_confirm = this.inp_new_confirm.get('value');

		var user = new User({username: cur_username, password: cur_password});
		var cur_key = JSON.stringify();

		var loading = function(yesno)
		{
			this.inp_submit.set('disabled', yesno);
			if(yesno) this.el_loader.addClass('active');
			else this.el_loader.removeClass('active');
		}.bind(this);

		var pending_barf = barfr.barf('Updating your login. Please be patient (and DO NOT close the app)!');
		loading(true);
		window._loading=loading;
		return delay(300).bind(this)
			.then(function() {
				return Promise.all([
					turtl.user.get_key(),
					user.get_key({skip_cache: true}),
					user.get_key({old: true, skip_cache: true})
				]);
			})
			.spread(function(cur_key, new_key, new_key_old) {
				var errors = [];
				cur_key = JSON.stringify(cur_key);
				new_key = JSON.stringify(new_key);
				new_key_old = JSON.stringify(new_key_old);
				if(new_key != cur_key && new_key_old != cur_key)
				{
					errors.push([this.inp_cur_username, 'The current username/password you entered do not match the currently logged in user\'s.']);
				}

				if(!this.check_errors(errors))
				{
					loading(false);
					barfr.close_barf(pending_barf);
					return;
				}

				var errors = UserJoinController.prototype.check_login(this.inp_new_username, this.inp_new_password, this.inp_new_confirm);
				if(!this.check_errors(errors))
				{
					loading(false);
					barfr.close_barf(pending_barf);
					return;
				}

				return turtl.user.change_password(new_username, new_password)
					.then(function() {
						barfr.barf('Your login was changed successfully!');
						turtl.route('/settings');
					})
					.finally(function() {
						barfr.close_barf(pending_barf);
					});
			})
			.catch(function(err) {
				turtl.events.trigger('ui-error', 'There was a problem changing your login. We are undoing the changes. Please try again.', err);
				log.error('settings: change password: ', derr(err));
				loading(false);
			});
	},

	match_username: function(e)
	{
		var username = this.inp_cur_username.get('value');
		this.inp_new_username.set('value', username);
	}
});

