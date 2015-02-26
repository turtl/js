var UserLoginController = FormController.extend({
	elements: {
		'input[name=username]': 'inp_username',
		'input[name=password]': 'inp_password'
	},

	events: {
		'click .button.login': 'submit'
	},

	buttons: false,
	title: 'Login',
	formclass: 'user-login',

	render: function()
	{
		var content = view.render('users/login');
		this.html(content);
		(function() { this.inp_username.focus(); }).delay(100, this);
	},

	submit: function(e)
	{
		if(e) e.stop();
		var username = this.inp_username.get('value');
		var password = this.inp_password.get('value');
		var user = new User({
			username: username,
			password: password
		});

		turtl.loading(true);
		user.test_auth().bind(this)
			.then(function(id) {
				var data = user.toJSON();
				data.id = id;
				turtl.user.set({
					username: user.get('username'),
					password: user.get('password')
				});
				turtl.user.login(data);
			})
			.catch(function(e) {
				barfr.barf('Login failed.');
				log.error('login error: ', e);
				turtl.loading(false);
			})
			.finally(function() {
				turtl.loading(false);
			});
	}
});

