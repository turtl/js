config.routes = {
	'/users/login': ['users', 'login'],
	'/users/welcome': ['users', 'welcome'],
	'/users/join': ['users', 'join'],
	'/users/logout': ['users', 'logout'],

	'/boards': ['boards', 'index'],
	'/boards/([0-9a-f]+)/notes': ['boards', 'notes'],

	'/settings': ['settings', 'index'],
	'/settings/password': ['settings', 'password'],

	'/': ['notes', 'index']
};

