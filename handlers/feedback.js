var feedback = {
	index: function()
	{
		turtl.back.clear();
		turtl.controllers.pages.load(FeedbackController, {}, {
			slide: false
		});
	}
};

