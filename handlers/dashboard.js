var dashboard = {
	load: function(board)
	{
		board = null;
		if(!turtl.profile.profile_data)
		{
			turtl.controllers.pages.trigger('loaded');
			return;
		}
		turtl.controllers.pages.load(DashboardController, {
			current_board: board
		});
	}
};
