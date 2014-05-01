var users = {
	login: function()
	{
		turtl.controllers.pages.load(UserIndexController);
	},

	/*
	join: function()
	{
		turtl.controllers.pages.load(UserJoinController);
	},
	*/

	logout: function()
	{
		turtl.user.logout();
		turtl.route('/users/login', {replace_state: true});
	}
};
