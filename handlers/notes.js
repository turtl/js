var notes = {
	index: function()
	{
		var page_con = turtl.controllers.pages.get_subcontroller('sub') || {board_id: 'all'};

		turtl.back.clear();
		turtl.controllers.pages.load(NotesIndexController, {board_id: 'all'}, {
			force_reload: true,
			slide: false
		});
	}
};

