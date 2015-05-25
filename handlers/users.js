var users = {
	login: function()
	{
		var slide = false;
		if(turtl.controllers.pages.is([UserJoinController, UserWelcomeController]))
		{
			slide = 'right';
		}
		turtl.controllers.pages.load(UserLoginController, {}, {
			slide: slide
		});
	},

	welcome: function()
	{
		var slide = turtl.controllers.pages.is(UserLoginController) ? 'left' : false;
		turtl.controllers.pages.load(UserWelcomeController, {}, {
			slide: slide
		});
	},

	join: function()
	{
		var slide = turtl.controllers.pages.is(UserWelcomeController) ? 'left' : false;
		turtl.controllers.pages.load(UserJoinController, {}, {
			slide: slide
		});
	},

	logout: function()
	{
		turtl.user.logout();
		turtl.route('/users/login', {replace_state: true});
	}
};

