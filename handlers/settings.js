var settings = {
	index: function()
	{
		var slide = false;
		if(turtl.controllers.pages.is([ChangePasswordController]))
		{
			slide = 'right';
		}
		turtl.controllers.pages.load(SettingsController, {}, {
			slide: slide
		});
	},

	password: function()
	{
		var slide = false;
		if(turtl.controllers.pages.is(SettingsController))
		{
			slide = 'left';
		}
		turtl.controllers.pages.load(ChangePasswordController, {}, {
			slide: slide
		});
	},
};

