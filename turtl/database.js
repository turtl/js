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
			version: 7,
			schema: function() { log.info('db.js: create schema'); return {
				// -------------------------------------------------------------
				// k/v tables - always has "key" field as primary key
				// -------------------------------------------------------------
				// holds metadata about the sync process ("sync_time", etc)
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
						board_id: {},
						has_file: {},
					}
				},
				// note that the files table holds raw/encrypted file data for
				// note attachments. the 'id' field is the HMAC hash from the
				// payload. also, there isn't a 1 to 1 mapping between records
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
				}
			}}
		}).done(function(server) {
			if(options.complete) options.complete(server);
		}).fail(function(e) {
			var idburl = 'https://turtl.it/docs/clients/core/indexeddb';
			//barfr.barf('Error opening local database.<br><a href="'+idburl+'" target="_blank">Is IndexedDB enabled in your browser?</a> Note that due to a bug in Firefox 25.* (and under), IndexedDB does not work in Private Browsing mode.', {message_persist: 'persist'});
			barfr.barf('Error opening local database.', {message_persist: 'persist'});
			console.error('database.setup: ', e);
		});
	}
};

