var boards = {
	notes: function()
	{
		var params = turtl.param_router.get();
		var space_id = params.space_id;
		var board_id = params.board_id;
		var force_reload = false;
		var page_con = turtl.controllers.pages.sub('sub') || {board_id: board_id};
		if(page_con.board_id != board_id) force_reload = true;
		if((page_con.search || {}).space != space_id) force_reload = true;

		turtl.back.push(turtl.route.bind(turtl, '/boards'));
		turtl.controllers.pages.load(NotesIndexController, {board_id: board_id}, {
			force_reload: force_reload,
			slide: false,
		});
	},
};

