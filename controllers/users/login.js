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
		var user = new User({
			username: username,
			password: password
		});

		turtl.loading(true);
		user.test_auth({
			success: function(id) {
				var data = user.toJSON();
				data.id = id;
				turtl.user.set({
					username: user.get('username'),
					password: user.get('password')
				});
				turtl.user.login(data);
				turtl.loading(false);
			}.bind(this),
			error: function(e) {
				barfr.barf('Login failed.');
				turtl.loading(false);
			}.bind(this)
		});
	}
});
