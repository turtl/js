var boards = {
	index: function()
	{
		if(!turtl.profile || !turtl.profile.profile_data)
		{
			turtl.controllers.pages.trigger('loaded');
			return;
		}
		turtl.controllers.pages.load(BoardsController, {});
	},

	view: function(board)
	{
		turtl.controllers.pages.load(BoardsViewController, {
			current_board: board
		});
	}
};

