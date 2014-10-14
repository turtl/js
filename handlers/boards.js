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

	view: function(board_id)
	{
		turtl.controllers.pages.load(BoardsViewController, {board_id: board_id});
	}
};

