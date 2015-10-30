var personas = {
	index: function()
	{
		var slide = false;
		if(turtl.controllers.pages.is(SettingsController))
		{
			slide = 'left';
		}
		turtl.controllers.pages.load(PersonasController, {}, {
			slide: slide
		});
	},

	join: function()
	{
		turtl.back.clear();
		var is_join = turtl.controllers.pages.is(UserJoinController);
		turtl.controllers.pages.load(PersonasJoinController, {}, {
			slide: is_join ? 'left' : false
		});
	}
};

