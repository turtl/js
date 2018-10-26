config.routes = {
	'/users/login': handlers.users.login,
	'/users/welcome': handlers.users.welcome,
	'/users/join': handlers.users.join,
	'/users/migrate': handlers.users.migrate,
	'/users/logout': handlers.users.logout,
	'/users/debug': handlers.users.debug,

	'/spaces/:space_id/notes': handlers.notes.index,
	'/spaces/:space_id/boards/:board_id/notes': handlers.boards.notes,
	'/spaces/:space_id/sharing': handlers.spaces.sharing,
	'/invites': handlers.invites.index,

	'/settings': handlers.settings.index,
	'/settings/password': handlers.settings.password,
	'/settings/delete-account': handlers.settings.delete_account,
	'/settings/sync': handlers.settings.sync,
	'/settings/export': handlers.settings.export,
	'/settings/logs': handlers.settings.logs,
	'/settings/feedback': handlers.settings.feedback,

	'/': handlers.notes.index
};

