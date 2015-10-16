var sharing = {
	index: function()
	{
		var slide = false;
		if(turtl.controllers.pages.is(NotesIndexController)) slide = 'right';
		turtl.back.clear();
		turtl.controllers.pages.load(SharingController, {}, {
			slide: slide
		});
	}
};

