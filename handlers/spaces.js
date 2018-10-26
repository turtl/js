handlers.spaces = {
	sharing: function() {
		var slide = false;
		if(turtl.controllers.pages.is([NotesIndexController])) {
			slide = 'left';
		}
		if(turtl.controllers.pages.is([InvitesController])) {
			slide = 'right';
		}
		turtl.controllers.pages.load(SpacesSharingController, {}, {
			slide: slide
		});
	},
};
