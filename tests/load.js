config.sync_to_api = false;
config.poll_api_for_changes = false;

turtl.events.bind('loaded', function() {
	// create a custom router before turtl/main.js has a chance to. allows us to
	// make our own mods to it
	turtl.router = new Composer.Router({});

	// disable url routing. we'll test components by loading handlers directly.
	turtl.router.route = function() {};
});

