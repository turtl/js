var dashboard = {
	load: function(board)
	{
		board = null;
		if(!tagit.profile.profile_data)
		{
			tagit.controllers.pages.trigger('loaded');
			return;
		}
		tagit.controllers.pages.load(DashboardController, {
			current_board: board
		});
	}
};
