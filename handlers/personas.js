var personas = {
	index: function()
	{
		turtl.back.clear();
		turtl.controllers.pages.load(PersonasController, {}, {
			slide: false
		});
	}
};

