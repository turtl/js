/**
 * This file holds our local database schema and setup procedures.
 */
var database = {
	/**
	 * Main database setup function: call this when you want to open the
	 * database. Calls options.complete() on success (with the opened db as the
	 * only arg).
	 */
	setup: function(options)
	{
		options || (options = {});

		// initialize our backing local storage.
		db.open({
			// DB has user id in it...client might have multiple users
			server: 'turtl.'+turtl.user.id(),
			version: 4,
			// NOTE: all tables that are sync between the client and the API
			// *must* have "local_change" and "last_mod" indexex. or else. or
			// else what?? or else it won't work.
			//
			// "local_change" lets the remote sync processes (local db -> API)
			// know that something has been changed locally and needs to be
			// synced to the API. It must be 1 or 0.
			//
			// "last_mod" lets the local sync process(es) know that something
			// has been changed (either by a remote sync call or by another
			// app "thread" in an addon) and should be synced to the in-memory
			// models.
			schema: {
				// -------------------------------------------------------------
				// k/v tables - always has "key" field as primary key
				// -------------------------------------------------------------
				// holds metadata about the sync process ("sync_time", etc)
				sync: {
					key: { keyPath: 'key', autoIncrement: false },
					indexes: {
					}
				},
				// holds one record (key="user") that stores the user's data/
				// settings
				user: {
					key: { keyPath: 'key', autoIncrement: false },
					indexes: {
						local_change: {},
						last_mod: {}
					}
				},

				// -------------------------------------------------------------
				// regular tables (uses "id" as pk, id is always unique)
				// -------------------------------------------------------------
				keychain: {
					key: { keyPath: 'id', autoIncrement: false },
					indexes: {
						local_change: {},
						last_mod: {},
						deleted: {},
						item_id: {}
					}
				},
				personas: {
					key: { keyPath: 'id', autoIncrement: false },
					indexes: {
						local_change: {},
						last_mod: {},
						deleted: {}
					}
				},
				boards: {
					key: { keyPath: 'id', autoIncrement: false },
					indexes: {
						user_id: {},
						local_change: {},
						last_mod: {},
						deleted: {}
					}
				},
				notes: {
					key: { keyPath: 'id', autoIncrement: false },
					indexes: {
						user_id: {},
						board_id: {},
						local_change: {},
						last_mod: {},
						deleted: {}
					}
				},
				files: {
					key: { keyPath: 'id', autoIncrement: false },
					indexes: {
						hash: {},
						synced: {},
						local_change: {},
						last_mod: {},
						deleted: {}
					}
				}
			}
		}).done(function(server) {
			if(options.complete) options.complete(server);
		}).fail(function(e) {
			var idburl	=	__site_url + '/help/indexeddb';
			barfr.barf('Error opening local database.<br><a href="'+idburl+'" target="_blank">Is IndexedDB enabled in your browser?</a>', {message_persist: 'persist'});
			console.log('database.setup: ', e);
		});
	}
};

