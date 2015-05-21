if(window.Composer) window.Composer.promisify({warn: true});

var config = {
	// filled in by extension/app from its manifest
	version: '0.4',

	// what client we're using
	client: 'core',

	//api_url: 'http://turtl.dev:8181/api',
	api_url: 'http://192.168.1.106:8181/api',

	site_url: 'https://turtl.it',
	base_url: '',

	// used to tell us where to store auth. this is only used when serving turtl
	// as a webapp (big no no). the addons do their own auth.
	user_cookie: 'turtl:user:v2',

	// the amount of time we let a client not sync with the server before
	// forcing a profile refresh.
	sync_cutoff: (60 * 60 * 24 * 30),

	// if true, any uncaught errors will be logged to the API for processing
	catch_global_errors: false,

	// enable things like INVITE TO GET MOAR STORAGE
	enable_promo: true
}
