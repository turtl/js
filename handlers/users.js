var users = {
	login: function()
	{
		turtl.controllers.pages.load(new UserIndexController());
	},

	join: function()
	{
		turtl.controllers.pages.load(new UserJoinController());
	},

	logout: function()
	{
		turtl.user.logout();
		turtl.route('/users/login', {replace_state: true});
	}
};
