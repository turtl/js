var boards = {
	notes: function()
	{
		var board_id = turtl.param_router.get().board_id;
		var force_reload = false;
		var page_con = turtl.controllers.pages.get_subcontroller('sub') || {board_id: board_id};
		if(page_con.board_id != board_id) force_reload = true;

		turtl.back.push(turtl.route.bind(turtl, '/boards'));
		turtl.controllers.pages.load(NotesIndexController, {board_id: board_id}, {
			force_reload: force_reload,
			slide: false,
		});
	},
};

