handlers.notes = {
	index: function() {
		if(!turtl.route_changed() && turtl.controllers.pages.is(NotesIndexController)) return;
		var slide = false;
		if(turtl.controllers.pages.is([SpacesSharingController, InvitesController])) {
			slide = 'right';
		}

		turtl.back.clear();
		turtl.controllers.pages.load(NotesIndexController, {board_id: 'all'}, {
			force_reload: true,
			slide: slide
		});
	}
};

