var personas = {
	index: function()
	{
		turtl.back.clear();
		turtl.controllers.pages.load(PersonasController, {}, {
			slide: false
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

