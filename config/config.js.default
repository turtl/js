if(window.Composer) window.Composer.promisify({warn: true});

var config = {
	// filled in by extension/app from its manifest
	version: '0.7',

	// filled in by the loading app (will be desktop/mobile generally)
	client: 'js',

	// some options for setting up our core communication
	core: {
		adapter: 'websocket',
		options: {},
	},

	// "Remember me" settings.
	// keep in mind that this is horribly insecure, and offered only as a
	// convenience to those willing to make a tradeoff in security.
	remember_me: {
		// whether or not to show the "Remember me" checkbox for login/join
		enabled: true,
		adapter: 'localstorage',
		options: {},
	},

	base_url: '',
	route_base: '',

	// if true, any uncaught errors will be logged to the API for processing
	catch_global_errors: true,

	// if a note is changed in the note editor, pop up a confirmation before
	// letting the unsaved changes get lost (due to modal closing)
	confirm_unsaved: true,
}
