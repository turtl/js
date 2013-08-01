// the app's routes
config.routes	=	{
	'/users/login': ['users', 'login'],
	'/users/join': ['users', 'join'],
	'/users/logout': ['users', 'logout'],

	'/bookmark': ['bookmark', 'index'],

	'/': ['dashboard', 'load']
}
