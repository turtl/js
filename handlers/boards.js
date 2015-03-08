var boards = {
	index: function()
	{
		var slide = false;
		var page_con = turtl.controllers.pages.get_subcontroller('sub');
		console.log('page id: ', page_con.board_id);
		if(page_con instanceof NotesIndexController && page_con.board_id != 'all')
		{
			slide = 'right';
		}
		turtl.controllers.pages.load(BoardsController, {}, {
			slide: slide
		});
	},

	notes: function(board_id)
	{
		turtl.controllers.pages.load(NotesIndexController, {board_id: board_id}, {
			slide: turtl.controllers.pages.is(BoardsController) ? 'left' : null
		});
	}
};

