/**
 * This file holds our local database schema and setup procedures.
 */
var database = {
	/**
	 * main DB setup function, creates a per-user database (user must be logged
	 * in for this to work)
	 */
	setup: function()
	{
		// initialize our backing local storage.
		return db.open({
			// DB has server/user id in it...client might have multiple users
			server: dbname(config.api_url, turtl.user.id()),
			version: 10,
			schema: function() { log.info('db.js: create schema'); return {
				// -------------------------------------------------------------
				// k/v tables - always has "key" field as primary key
				// -------------------------------------------------------------
				// holds metadata about the sync process ("sync_time", etc)
				// TODO: use local storage for sync??
				sync: {
					key: { keyPath: 'key', autoIncrement: false },
					indexes: { }
				},
				// holds one record (key="user") that stores the user's data/
				// settings
				user: {
					key: { keyPath: 'key', autoIncrement: false },
					indexes: { }
				},

				// -------------------------------------------------------------
				// regular tables (uses "id" as pk, id is always unique)
				// -------------------------------------------------------------
				keychain: {
					key: { keyPath: 'id', autoIncrement: false },
					indexes: {
						item_id: {}
					}
				},
				personas: {
					key: { keyPath: 'id', autoIncrement: false },
					indexes: { }
				},
				boards: {
					key: { keyPath: 'id', autoIncrement: false },
					indexes: {
						user_id: {},
					}
				},
				notes: {
					key: { keyPath: 'id', autoIncrement: false },
					indexes: {
						user_id: {},
						boards: {multiEntry: true},
						has_file: {},
					}
				},
				// note that the files table holds raw/encrypted file data for
				// note attachments. there's not a 1-1 mapping between records
				// in the files table and in-memory models, mainly because files
				// are decrypted on-demand and aren't always going to be loaded
				// in memory.
				files: {
					key: { keyPath: 'id', autoIncrement: false },
					indexes: {
						note_id: {},
						synced: {},
						has_data: {},
					}
				},

				// these tables hold incoming/outgoing sync data
				sync_outgoing: {
					key: { keyPath: 'id', autoIncrement: true },
					indexes: { }
				}
			}}
		});
	},

	/**
	 * setup the database that holds any of the different users of this client
	 * (which could just be one). storing this locally allows us to do auth
	 * against the local database.
	 */
	setup_user: function()
	{
		// initialize our backing local storage.
		return db.open({
			// DB has user id in it...client might have multiple users
			server: 'turtl.users',
			version: 1,
			schema: function() { log.info('db.js: create schema'); return {
				users: {
					key: { keyPath: 'id', autoIncrement: false },
					indexes: { 
						a: {}
					}
				}
			}}
		});
	}
};

