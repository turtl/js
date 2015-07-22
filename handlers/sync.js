var sync = {
	index: function()
	{
		turtl.back.clear();
		turtl.controllers.pages.load(SyncController, {}, {
			slide: false
		});
	}
};

