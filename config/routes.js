config.routes = {
	'/users/login': ['users', 'login'],
	'/users/welcome': ['users', 'welcome'],
	'/users/join': ['users', 'join'],
	'/users/migrate': ['users', 'migrate'],
	'/users/logout': ['users', 'logout'],
	'/users/debug': ['users', 'debug'],

	'/spaces/:space_id/notes': ['notes', 'index'],
	'/spaces/:space_id/boards/:board_id/notes': ['boards', 'notes'],
	'/spaces/:space_id/sharing': ['spaces', 'sharing'],
	'/invites': ['invites', 'index'],

	'/settings': ['settings', 'index'],
	'/settings/password': ['settings', 'password'],
	'/settings/delete-account': ['settings', 'delete_account'],
	'/settings/sync': ['settings', 'sync'],
	'/settings/export': ['settings', 'export'],
	'/settings/logs': ['settings', 'logs'],
	'/settings/feedback': ['settings', 'feedback'],

	'/': ['notes', 'index']
};

