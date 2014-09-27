// the app's routes
config.routes = {
	'/users/login': ['users', 'login'],
	'/users/join': ['users', 'join'],
	'/users/logout': ['users', 'logout'],

	'/': ['boards', 'index'],
	'/board/([0-9a-f]+)': ['boards', 'view']
};

