// the app's routes
config.routes = {
	'/users/login': ['users', 'login'],
	'/users/welcome': ['users', 'welcome'],
	'/users/join': ['users', 'join'],
	'/users/logout': ['users', 'logout'],

	'/': ['boards', 'index'],
	'/boards/([0-9a-f]+)': ['boards', 'view']
};

