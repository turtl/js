var users = {
	login: function()
	{
		tagit.controllers.pages.load(UserLoginController);
	},

	join: function()
	{
		tagit.controllers.pages.load(UserJoinController);
	},

	logout: function()
	{
		tagit.user.logout();
		tagit.route('/users/login', {replace_state: true});
	}
};
