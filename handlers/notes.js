var notes = {
	index: function()
	{
		var force_reload = false;
		var page_con = turtl.controllers.pages.get_subcontroller('sub') || {board_id: 'all'};
		if(page_con.board_id != 'all') force_reload = true;

		turtl.controllers.pages.load(NotesIndexController, {board_id: 'all'}, {
			force_reload: force_reload,
			slide: false
		});
	}
};

