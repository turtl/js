// the app's routes
config.routes = {
	'/users/login': ['users', 'login'],
	'/users/logout': ['users', 'logout'],

	'/bookmark': ['bookmark', 'index'],

	'/': ['dashboard', 'load'],
	// FF stupidness
	'/turtl.xul': ['dashboard', 'load']
}
