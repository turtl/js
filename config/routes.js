config.routes = {
	'/users/login': ['users', 'login'],
	'/users/welcome': ['users', 'welcome'],
	'/users/join': ['users', 'join'],
	'/users/logout': ['users', 'logout'],

	'/spaces/:space_id/notes': ['notes', 'index'],
	'/spaces/:space_id/boards': ['boards', 'index'],
	'/spaces/:space_id/boards/:board_id/notes': ['boards', 'notes'],

	'/settings': ['settings', 'index'],
	'/settings/password': ['settings', 'password'],
	'/settings/delete-account': ['settings', 'delete_account'],

	'/sync': ['sync', 'index'],

	'/feedback': ['feedback', 'index'],

	'/': ['notes', 'index']
};

