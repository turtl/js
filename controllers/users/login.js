var UserLoginController = Composer.Controller.extend({
	inject: tagit.main_container_selector,

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
	},

	do_login: function(e)
	{
		if(e) e.stop();
	}
});
