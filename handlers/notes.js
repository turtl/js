var notes = {
	index: function()
	{
		turtl.controllers.pages.load(NotesIndexController, {board_id: 'all'}, {
			slide: false
		});
	}
};

