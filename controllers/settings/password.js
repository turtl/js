var ChangePasswordController = FormController.extend({
	elements: {
		'input[name=cur_username]': 'inp_cur_username',
		'input[name=cur_password]': 'inp_cur_password',
		'input[name=new_username]': 'inp_new_username',
		'input[name=new_password]': 'inp_new_password',
		'input[name=new_confirm]': 'inp_new_confirm',
		'input[type=submit]': 'inp_submit'
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

		var errors = [];
		var user = new User({username: cur_username, password: cur_password});
		var cur_key = JSON.stringify(turtl.user.get_key());
		if(JSON.stringify(user.get_key({skip_cache: true})) != cur_key && JSON.stringify(user.get_key({old: true, skip_cache: true})) != cur_key)
		{
			errors.push([this.inp_cur_username, 'The current username/password you entered do not match the currently logged in user\'s.']);
		}
		if(!this.check_errors(errors)) return;

		var errors = UserJoinController.prototype.check_login(this.inp_new_username, this.inp_new_password, this.inp_new_confirm);
		if(!this.check_errors(errors)) return;

		this.inp_submit.disabled = true;
		turtl.user.change_password(new_username, new_password).bind(this)
			.then(function() {
				barfr.barf('Your login was changed successfully!');
				turtl.route('/settings');
			})
			.catch(function(err) {
				turtl.events.trigger('ui-error', 'There was a problem changing your login. We are undoing the changes. Please try again.', err);
				log.error('settings: change password: ', derr(err));
				this.inp_submit.disabled = false;
			});
	},

	match_username: function(e)
	{
		var username = this.inp_cur_username.get('value');
		this.inp_new_username.set('value', username);
	}
});

