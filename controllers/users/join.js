var UserJoinController = Composer.Controller.extend({
	inject: turtl.main_container_selector,

	elements: {
		'input[name=username]': 'inp_username',
		'input[name=password]': 'inp_password',
		'input[name=confirm]': 'inp_confirm',
		'input[type=submit]': 'submit'
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

		if(password.length < 4)
		{
			barfr.barf('We don\'t mean to tell you your business, but a password less than four characters won\'t cut it. Try again.');
			this.inp_password.focus();
			return false;
		}

		if(password.toLowerCase() == 'password')
		{
			barfr.barf('You want to secure all of your data using <em>that</em> password? Be our guest...');
		}

		this.submit.disabled = true;

		var user = new User({
			username: username,
			password: password
		});
		turtl.loading(true);
		user.join({
			success: function(userdata) {
				var data = user.toJSON();
				data.id = userdata.id;
				turtl.user.set({
					username: user.get('username'),
					password: user.get('password')
				});
				turtl.user.login(data);
				turtl.loading(false);
				turtl.route('/');
			}.bind(this),
			error: function() {
				turtl.loading(false);
				this.submit.disabled = false;
			}.bind(this)
		});
	}
});
