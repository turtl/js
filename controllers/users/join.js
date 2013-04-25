var UserJoinController = Composer.Controller.extend({
	inject: tagit.main_container_selector,

	elements: {
		'input[name=username]': 'inp_username',
		'input[name=password]': 'inp_password',
		'input[name=confirm]': 'inp_confirm'
	},

	events: {
		'submit form': 'do_join'
	},

	init: function()
	{
		this.render();
	},

	render: function()
	{
		var content = Template.render('users/join');
		this.html(content);
		this.inp_username.focus();
	},

	do_join: function(e)
	{
		if(e) e.stop();
		var username = this.inp_username.get('value');
		var password = this.inp_password.get('value');
		var pconfirm = this.inp_confirm.get('value');

		if(password != pconfirm)
		{
			barfr.barf('Your password does not match the confirmation.');
			this.inp_password.focus();
			return false;
		}

		var user = new User({
			username: username,
			password: password
		});
		tagit.loading(true);
		user.join({
			success: function() {
				tagit.user.login(user.toJSON());
				tagit.loading(false);
			}.bind(this),
			error: function() {
				tagit.loading(false);
			}.bind(this)
		});
	}
});
