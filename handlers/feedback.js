var feedback = {
	index: function()
	{
		var slide = false;
		if(turtl.controllers.pages.is(SettingsController))
		{
			slide = 'left';
		}
		turtl.back.push(turtl.route.bind(turtl, '/settings'));
		turtl.controllers.pages.load(FeedbackController, {}, {
			slide: slide
		});
	}
};

