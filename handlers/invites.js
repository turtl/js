handlers.invites = {
	index: function() {
		var slide = false;
		if(turtl.controllers.pages.is([NotesIndexController, SpacesSharingController])) {
			slide = 'left';
		}
		turtl.controllers.pages.load(InvitesController, {}, {
			slide: slide
		});
	},
};

