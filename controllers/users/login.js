var UserLoginController = Composer.Controller.extend({
	inject: turtl.main_container_selector,

	elements: {
		'input[name=username]': 'inp_username',
		'input[name=password]': 'inp_password'
	},

	events: {
		'submit form': 'do_login'
	},

	init: function()
	{
		this.render();
	},

	render: function()
	{
		var content = Template.render('users/login');
		this.html(content);
		this.inp_username.focus.delay(100, this.inp_username);
	},

	do_login: function(e)
	{
		if(e) e.stop();
		var username = this.inp_username.get('value');
		var password = this.inp_password.get('value');

		turtl.loading(true);
		turtl.user.set({
			username: username,
			password: password
		});
		turtl.user.login({
			complete: function() {
				turtl.loading(false);
			},
			error: function(ev) {
				barfr.barf('Login failed.');
				turtl.user.clear();
			}
		});
	}
});
