var users = {
	login: function()
	{
		var slide = turtl.controllers.pages.is(UserJoinController) ? 'right' : false;
		turtl.controllers.pages.load(UserLoginController, {}, {
			slide: slide
		});
	},

	join: function()
	{
		var slide = turtl.controllers.pages.is(UserLoginController) ? 'left' : false;
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
