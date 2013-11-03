var Profile = Composer.RelationalModel.extend({
	relations: {
		keychain: {
			type: Composer.HasMany,
			collection: 'Keychain'
		},
		personas: {
			type: Composer.HasMany,
			collection: 'Personas'
		},
		boards: {
			type: Composer.HasMany,
			collection: 'Boards'
		},
		notes: {
			type: Composer.HasMany,
			collection: 'Notes'
		},
		files: {
			type: Composer.HasMany,
			collection: 'Files'
		}
	},

	// stores whether or not all profile data has been downloaded
	profile_data: false,

	// tracks items to ignore when a sync occurs. this is useful for ignoring
	// things that the user just changed which can overwrite data with older
	// versions.
	sync_ignore: [],

	// timer for persisting
	persist_timer: null,

	// if true, will NOT send "profile changed" event on profile...change.
	// mainly used to prevent double-syncs
	in_sync: false,

	init: function()
	{
		this.bind_relational('boards', 'destroy', function(board) {
			if(this.get_current_board() == board)
			{
				this.set_current_board(this.get('boards').first());
			}
		}.bind(this));
		this.bind_relational('boards', 'add', function(board) {
			if(this.get('boards').models().length == 1)
			{
				this.set_current_board(board);
			}
		}.bind(this));
	},

	/**
	 * called when we want to populate the current user's profile.
	 *
	 * checks if the profile has already been synced against the API (first run)
	 * and if so, loads from the local db where all the profile items should be
	 * stored. if no local db profile data is present, populate() grabs the
	 * profile from the API, syncs it to the local db, then continues populating
	 * from the db data.
	 */
	populate: function(options)
	{
		options || (options = {});

		// called when we're sure we have downloaded the profile and populated
		// the local DB with it
		var finished	=	function()
		{
			this.profile_data	=	true;
			var profile_data	=	{};

			var num_items	=	0;
			var num_synced	=	0;

			// called each time we get data from the local DB. 
			var finished	=	function()
			{
				num_synced++;
				// only continue when all local DB grabs are done
				if(num_synced < num_items) return false;

				// this prevents the profile from double-loading once the local
				// sync starts (if the profile loads from API and populates
				// itself into the local DB, it sets last_mod on all added data.
				// then when the local sync process starts, it will load all
				// that data again, even though it's about to all be loaded here
				// by the profile. this tricks the local sync into not double
				// loading).
				turtl.sync.time_track.local	=	new Date().getTime();

				// once we have all our data, populate the profile with it
				this.load_from_data(profile_data, options);
			}.bind(this);

			// populate the user data separately
			num_items++;
			turtl.db.user.get('user').done(function(userdata) {
				turtl.user.set(userdata);
				finished();
			});

			// load the profile from local db, collection by collection
			['keychain', 'personas', 'boards', 'notes'].each(function(itemname) {
				num_items++;
				turtl.db[itemname].query().filter().execute().done(function(res) {
					// filter out deleted entries
					res	=	res.filter(function(item) {
						return item.deleted !== 1;
					});
					profile_data[itemname]	=	res;
					finished();
				});
			});
		}.bind(this);

		// check if we need to download the profile (first-run). we do this by
		// grabbing the last sync time. if present, then yes, syncing has
		// already been setup on this client, otherwise we load the profile into
		// the db, set the sync time record, and continue loading.
		turtl.db.sync.get('sync_id').then(
			function(res) {
				var make_the_call	=	function()
				{
					turtl.api.get('/profiles/users/'+turtl.user.id(), {}, {
						success: function(profile) {
							// send all profile data to the local db
							this.persist_profile_to_db(profile, {
								complete: function() {
									// profile is downloaded, and all records are in
									// our local db. continue.
									finished();
								}.bind(this)
							});
						}.bind(this),
						error: function(err) {
							barfr.barf('Error loading user profile from server: '+ err);
							if(options.error) options.error(e);
						}
					});
				}.bind(this);

				if(res)
				{
					var sync_id		=	res.value;
					var timestamp	=	parseInt(sync_id.substr(0, 8), 16);
					var month		=	(new Date().getTime() / 1000) - 2592000;
					if(timestamp > month)
					{
						return finished();
					}
					else
					{
						// clear tables in local DB, when finished call
						// make_the_call

						return;
					}
				}
				make_the_call();
			}.bind(this),
			function(err) {
				barfr.barf('There was a problem with the initial load of your profile: '+ err);
			}.bind(this)
		);
	},

	/**
	 * Given a set of profile data (user, boards, notes, etc), save all the data
	 * to the local db.
	 *
	 * The purpose of this is that once we do our initial profile sync, we save
	 * it locally and from then on do incremental updates to the data instead of
	 * loading it on every login.
	 *
	 * Note that this function should only get called when:
	 *  - the user has never logging in to their account on this client
	 *  - the last sync the profile on this client had was more than the
	 *    allowed time (config.sync_cutoff)
	 */
	persist_profile_to_db: function(profile, options)
	{
		options || (options = {});

		var num_items	=	0;
		var num_added	=	0;

		// populates a collection of data into a table. collects all errors as
		// it goes along. when finished, calls options.complete.
		var populate	=	function(table, collection, options)
		{
			options || (options = {});

			num_items++;
			if(!collection)
			{
				if(options.complete) options.complete([]);
				return;
			}

			// update our mod time
			collection	=	collection.map(function(item) {
				item.last_mod	=	new Date().getTime();
				return item;
			});

			var errors	=	[];
			turtl.db[table].update.apply(turtl.db[table], collection).then(
				function(recs) {
					if(options.complete) options.complete(errors);
				},
				function(errs) {
					if(!errs instanceof Array) errs = [errs];
					errors.concat(errs);
				}
			);
		};

		// sets a particular key/value entry into a table, calls
		// options.complete when finished.
		var set_key	=	function(table, key, value, options)
		{
			options || (options = {});

			// k/v pairs in the db should always use the primary field "key"
			var clone	=	Object.clone(value);
			clone['key']	=	key;

			// let populate do the work
			populate(table, [clone], options);
		};

		// called when our individual saves below finish
		var complete_fn	=	function(name) {
			return function(errors) {
				if(errors.length > 0) barfr.barf('Error(s) persisting profile '+ name +': '+ errors.join(', '));
				num_added++;
				if(num_added < num_items) return false;

				// only set the sync time once all data has been saved
				turtl.sync.set({sync_id: profile.sync_id});
				turtl.sync.save();

				// continue
				if(options.complete) options.complete();
			};
		};

		// run the actual data persists
		set_key('user', 'user', profile.user, {complete: complete_fn('user')});
		populate('keychain', profile.keychain, {complete: complete_fn('keychain')});
		populate('personas', profile.personas, {complete: complete_fn('personas')});
		populate('boards', profile.boards, {complete: complete_fn('boards')});
		populate('notes', profile.notes, {complete: complete_fn('notes')});
	},

	/**
	 * When we get a set of profile data, load it incrementally here, calling
	 * options.complete() when finished.
	 *
	 * this function also does some basic setup, such as selecting the first
	 * board as the current board.
	 */
	load_from_data: function(data, options)
	{
		options || (options = {});

		var keychain	=	this.get('keychain');
		var personas	=	this.get('personas');
		var boards		=	this.get('boards');
		var notes		=	this.get('notes');

		var done		=	function()
		{
			this.loaded	=	true;
			// turn tag tracking back on
			boards.each(function(b) {
				b.get('notes').refresh();
				b.track_tags(true);
				(function() { 
					b.get('tags').refresh_from_notes(b.get('notes'), {silent: true});
					b.get('tags').trigger('reset');
					b.trigger('notes_updated');
				}).delay(1, this);
			});
			var board	=	null;
			if(options.board)
			{
				board	=	boards.select_one({id: options.board.clean()});
			}
			if(!board) board = boards.first();
			if(board) this.set_current_board(board);
			if(options.complete) options.complete();
		}.bind(this);

		// import the keychain first, since decrypting just about anything
		// requires it.
		keychain.reset_async(data.keychain, {
			complete: function() {
				// reset the boards next
				boards.reset_async(data.boards, {
					complete: function() {
						// save some performance here by not tracking tags while updating
						boards.each(function(b) { b.track_tags(false); });
						personas.reset_async(data.personas, {
							complete: function() {
								notes.reset_async(data.notes, {
									complete: function() {
										done();
									}
								});
							}
						});
					}
				});
			}
		});
	},

	get_current_board: function()
	{
		var cur	=	this.get('current_board', false);
		if(!cur) cur = this.get('boards').first();
		return cur;
	},

	set_current_board: function(obj, options)
	{
		options || (options = {});
		return this.set({current_board: obj}, options);
	},

	/**
	 * Keeps track of items to IGNORE when a sync happens
	 */
	track_sync_changes: function(id)
	{
		this.sync_ignore.push(id);
	},

	// TODO: rename me to toJSONAsync, remove localStorage junk
	persist: function(options)
	{
		options || (options = {});

		var do_persist	=	function(options)
		{
			options || (options = {});
			var user		=	turtl.user.toJSON();
			user.personas	=	turtl.user.get('personas').toJSON();
			var store		=	{
				user: user,
				boards: []
			};

			var finish_persist	=	function()
			{
				var tsnow	=	Math.floor(new Date().getTime()/1000);
				store.time	=	this.get('sync_time', tsnow);
				if(window.port) window.port.send('profile-save', store);

				if(options.complete) options.complete(store);

				if(!turtl.mirror) return false;

				localStorage['profile:user:'+turtl.user.id()]	=	JSON.encode(store);
				localStorage['scheme_version']					=	config.mirror_scheme_version;
			}.bind(this);

			var boards			=	turtl.profile.get('boards');	// clone
			var num_boards		=	boards.models().length;
			var num_finished	=	0;

			// check for empty profile =]
			if(num_boards == 0) finish_persist();

			turtl.profile.get('boards').each(function(board) {
				board.get('notes').toJSONAsync(function(notes) {
					var boardobj	=	board.toJSON();
					boardobj.notes	=	notes;
					store.boards.push(boardobj);
					num_finished++;
					if(num_finished >= num_boards)
					{
						finish_persist();
					}
				}.bind(this));
			}.bind(this));
		}.bind(this);

		if(options.now)
		{
			do_persist(options);
		}
		else
		{
			this.persist_timer.end	=	function() { do_persist(options); };
			this.persist_timer.start();
		}
	}

	// -------------------------------------------------------------------------
	// old sync code. (keep around until we're sure the local DB stuff works)
	// -------------------------------------------------------------------------
	/*
	sync: function(options)
	{
		options || (options = {});
		if(!turtl.sync || !turtl.user.logged_in) return false;

		var sync_time = this.get('sync_time', 9999999);
		turtl.api.post('/sync', {time: sync_time}, {
			success: function(sync) {
				this.set({sync_time: sync.time});
				this.process_sync(sync, options);
			}.bind(this),
			error: function(e, xhr) {
				if(xhr.status == 0)
				{
					barfr.barf(
						'Error connecting with server. Your changes may not be saved.<br><br><a href="#" onclick="window.location.reload()">Try reloading</a>.'
					);
				}
				else
				{
					barfr.barf('Error syncing user profile with server: '+ e);
				}
				if(options.error) options.error(e);
			}.bind(this)
		});

		turtl.messages.sync();
	},
	*/

	/**
	 * Process data gotten from a server sync. It can be changed user data, new
	 * boards, deleted notes, etc. This is basically the function that applies
	 * the diffs that come from `POST /sync`
	 *
	 * Note that the changes here happen synchronously. If they are ever changed
	 * to be async (which is entirely possible, and very likely) then the state
	 * var in_sync must be set to trigger at the very and of all the updates.
	 * Otherwise, it could case endless sync loops (or at least double-syncs).
	 *
	 * TODO: if sync data is ever applied async (most probably to the notes)
	 * then be sure to update in_sync accordingly
	 */
	/*
	process_sync: function(sync, options)
	{
		options || (options = {});

		// starting a sync
		this.trigger('sync-pre');

		// send synced data to addon
		if(window.port && window._in_background && turtl.sync && sync)
		{
			window.port.send('profile-sync', sync);
		}

		// disable sync tracking to prevent endless sync loops
		this.in_sync	=	true;

		if(	(sync.personas && sync.personas.length > 0) ||
			(sync.boards && sync.boards.length > 0) ||
			(sync.notes && sync.notes.length > 0) )
		{
			//console.log('sync: ', sync, this.sync_ignore);
		}

		// if we're syncing user data, update it
		if(sync.user)
		{
			turtl.user.set(sync.user);
		}

		if(sync.personas) sync.personas.each(function(persona_data) {
			// don't sync ignored items
			if(this.sync_ignore.contains(persona_data.id))
			{
				this.sync_ignore.erase(persona_data.id);
				return false;
			}

			var persona	=	turtl.user.get('personas').find_by_id(persona_data.id);
			if(persona_data.deleted)
			{
				if(persona) persona.destroy_persona({skip_sync: true});
			}
			else if(persona)
			{
				persona.set(persona_data);
			}
			else
			{
				turtl.user.get('personas').upsert(new Persona(persona_data));
			}
		}.bind(this));

		if(sync.boards) sync.boards.each(function(board_data) {
			// don't sync ignored items
			if(this.sync_ignore.contains(board_data.id))
			{
				this.sync_ignore.erase(board_data.id);
				return false;
			}

			var board	=	turtl.profile.get('boards').find_by_id(board_data.id);
			if(board_data.deleted)
			{
				if(board) board.destroy({skip_sync: true});
			}
			else if(board)
			{
				if(board_data.user_id && board_data.user_id != turtl.user.id())
				{
					board_data.shared	=	true;
				}
				board.set(board_data);
			}
			else
			{
				// make sure this isn't a rogue/shared board sync. sometimes a
				// shared board will sync AFTER it's deleted, bringing us here.
				// luckily, we can detect it via board.shared == true, and
				// board.privs.does_not_contain(any_of_my_personas).
				if(board_data.shared)
				{
					var persona_ids		=	turtl.user.get('personas').map(function(p) { return p.id(); });
					var has_my_persona	=	false;
					Object.keys(board_data.privs).each(function(pid) {
						if(persona_ids.contains(pid)) has_my_persona = true;
					});

					// board is shared, and I'm not on the guest list. not sure
					// why I got an invite telling me to join a board I'm not
					// actually invited to, but let's save ourselves the heart-
					// break and skip out on this one
					if(!has_my_persona) return false;
				}
				turtl.profile.get('boards').upsert(new Board(board_data));
			}
		}.bind(this));

		if(sync.notes) sync.notes.each(function(note_data) {
			// don't sync ignored items
			if(this.sync_ignore.contains(note_data.id))
			{
				this.sync_ignore.erase(note_data.id);
				return false;
			}

			// check if the note is already in an existing board. if
			// so, save both the original board (and existing note)
			// for later
			var oldboard = false;
			var note = false;
			this.get('boards').each(function(p) {
				if(note) return;
				note = p.get('notes').find_by_id(note_data.id)
				if(note) oldboard = p;
			});

			// get the note's current board
			var newboard	=	this.get('boards').find_by_id(note_data.board_id);

			// note was deleted, remove it
			if(note && note_data.deleted)
			{
				oldboard.get('notes').remove(note);
				note.destroy({skip_sync: true});
				note.unbind();
			}
			// this is an existing note. update it, and be mindful of the
			// possibility of it moving boards
			else if(note && oldboard)
			{
				note.set(note_data);
				if(newboard && oldboard.id() != newboard.id())
				{
					// note switched board IDs. move it.
					oldboard.get('notes').remove(note);
					newboard.get('notes').add(note);
				}
			}
			// note isn't existing and isn't being deleted. add it!
			else if(!note_data.deleted && newboard)
			{
				newboard.get('notes').add(note_data);
			}
		}.bind(this));

		// enable sync tracking again. if the above was processed async, then
		// this needs to be at the end of the async processing.
		this.in_sync	=	false;

		// reset ignore list
		this.sync_ignore	=	[];

		// let the world know syncing is done
		this.trigger('sync-post');
	},
	*/
});

