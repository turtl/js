var boards = {
	index: function()
	{
		var slide = false;
		var page_con = turtl.controllers.pages.get_subcontroller('sub');
		if((page_con instanceof NotesIndexController) && page_con.board_id != 'all')
		{
			slide = 'right';
		}
		turtl.back.clear();
		turtl.controllers.pages.load(BoardsController, {}, {
			slide: slide
		});
	},

	notes: function(board_id)
	{
		var force_reload = false;
		var page_con = turtl.controllers.pages.get_subcontroller('sub') || {board_id: board_id};
		if(page_con.board_id != board_id) force_reload = true;

		turtl.back.push(turtl.route.bind(turtl, '/boards'));
		turtl.controllers.pages.load(NotesIndexController, {board_id: board_id}, {
			force_reload: force_reload,
			slide: turtl.controllers.pages.is([BoardsController]) ? 'left' : null
		});
	},
};

