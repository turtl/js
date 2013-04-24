// the app's routes
config.routes	=	{
	'/users/login': ['users', 'login'],
	'/users/join': ['users', 'join'],
	'/([a-z0-9]*)': ['dashboard', 'load'],
}
