var boards = {
	index: function()
	{
		if(!turtl.profile || !turtl.profile.profile_data)
		{
			turtl.controllers.pages.trigger('loaded');
			return;
		}
		turtl.controllers.pages.load(BoardsController, {}, {
			slide: turtl.controllers.pages.is(BoardsViewController) ? 'right' : null
		});
	},

	view: function(board_id)
	{
		turtl.controllers.pages.load(BoardsViewController, {board_id: board_id}, {
			slide: turtl.controllers.pages.is(BoardsController) ? 'left' : null
		});
	}
};

