var boards = {
	index: function()
	{
		if(!turtl.profile || !turtl.profile.profile_data)
		{
			turtl.controllers.pages.trigger('loaded');
			return;
		}
		turtl.controllers.pages.load(BoardsController, {}, {
			slide: turtl.controllers.pages.is(NotesIndexController) ? 'right' : null
		});
	},

	view: function(board_id)
	{
		if(!turtl.profile || !turtl.profile.profile_data)
		{
			turtl.controllers.pages.trigger('loaded');
			return;
		}
		turtl.controllers.pages.load(NotesIndexController, {board_id: board_id}, {
			slide: turtl.controllers.pages.is(BoardsController) ? 'left' : null
		});
	}
};

