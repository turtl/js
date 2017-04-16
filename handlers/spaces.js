var spaces = {
	sharing: function() {
		var slide = false;
		if(turtl.controllers.pages.is([NotesIndexController])) {
			slide = 'left';
		}
		turtl.controllers.pages.load(SpacesSharingController, {}, {
			slide: slide
		});
	},
};
