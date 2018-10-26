handlers.users = {
	login: function()
	{
		var slide = false;
		if(turtl.controllers.pages.is([UserJoinController, UserWelcomeController, UserMigrateController]))
		{
			slide = 'right';
		}
		if(turtl.controllers.pages.is(UserLoginController)) return;
		turtl.controllers.pages.load(UserLoginController, {}, {
			slide: slide
		});
	},

	welcome: function()
	{
		var slide = turtl.controllers.pages.is(UserLoginController) ? 'left' : false;
		if(turtl.controllers.pages.is(UserWelcomeController)) return;
		turtl.controllers.pages.load(UserWelcomeController, {}, {
			slide: slide
		});
	},

	join: function()
	{
		var slide = turtl.controllers.pages.is(UserWelcomeController) ? 'left' : false;
		if(turtl.controllers.pages.is(UserJoinController)) return;
		turtl.controllers.pages.load(UserJoinController, {}, {
			slide: slide
		});
	},

	migrate: function() {
		var slide = turtl.controllers.pages.is(UserLoginController) ? 'left' : false;
		if(turtl.controllers.pages.is(UserMigrateController)) return;
		turtl.controllers.pages.load(UserMigrateController, {}, {
			slide: slide
		});
	},

	logout: function()
	{
		turtl.user.logout();
		turtl.route('/users/login', {replace_state: true});
	},

	debug: function() {
		turtl.controllers.pages.load(UserLoginDebugController, {}, {});
	},
};

