var Profile = Composer.RelationalModel.extend({
	relations: {
		keychain: {
			collection: 'Keychain'
		},
		personas: {
			collection: 'Personas'
		},
		boards: {
			collection: 'Boards'
		},
		notes: {
			collection: 'Notes',
			options: {
				forward_all_events: true,
				refresh_on_change: false
			}
		},
		invites: {
			collection: 'Invites'
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
	load: function(options)
	{
		options || (options = {});

		// check if we need to download the profile (first-run). we do this by
		// grabbing the last sync time. if present, then yes, syncing has
		// already been setup on this client, otherwise we load the profile into
		// the db, set the sync time record, and continue loading.
		this.profile_data = true;
		var profile_data = {};
		return turtl.db.user.get('user').bind(this)
			.then(function(userdata) {
				turtl.user.set(userdata);
			})
			.then(function() {
				return turtl.db.sync.get('sync_id');
			})
			.then(function(res) {
				// TODO: ok, we have (not) a sync id, do we grab profile from
				// API, or do we sync it incrementally?
				if(!res)
				{
					turtl.update_loading_screen(i18next.t('Grabbing profile from server'));
					return this.load_profile_from_api();
				}
				else
				{
					// let's run an initial API -> DB sync, we may be behind.
					// if we load old data against a new password, we're screwed
					turtl.sync.set({sync_id: res.value});
					turtl.update_loading_screen(i18next.t('Syncing changes from server'));
					return turtl.sync.poll_api_for_changes({immediate: true, force: true})
						.catch(function(err) {
							// if we have a connection error, continue without
							// the initial sync. it's not essential, but nice to
							// have
							if(!(err && err.disconnected)) throw err;
						});
				}
			})
			.then(function() {
				turtl.update_loading_screen(i18next.t('Loading profile'));
				return ['keychain', 'personas', 'boards', 'notes', 'invites'];
			})
			.map(function(itemname) {
				return turtl.db[itemname].query().all().execute().then(function(res) {
					profile_data[itemname] = res;
				});
			})
			.then(function() {
				return this.load_from_data(profile_data, options);
			})
			.then(function() {
				return this.load_deserialized();
			})
			.then(function() {
				this.trigger('populated');
			});
	},

	load_profile_from_api: function()
	{
		return turtl.api.get('/sync/full', null, {timeout: 600000})
			.then(function(profile_sync) {
				return turtl.sync.update_local_db_from_api_sync(profile_sync);
			})
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

		var num_items = 0;
		var num_added = 0;

		// populates a collection of data into a table. collects all errors as
		// it goes along
		var populate = function(table, collection)
		{
			return turtl.db[table].update.apply(turtl.db[table], collection);
		};

		// sets a particular key/value entry into a table
		var set_key = function(table, key, value, options)
		{
			options || (options = {});

			// k/v pairs in the db should always use the primary field "key"
			var clone = Object.clone(value);
			clone['key'] = key;

			// let populate do the work
			return populate(table, [clone], options);
		};

		// run the actual data persists
		return Promise.all([
			set_key('user', 'user', profile.user),
			populate('keychain', profile.keychain),
			populate('personas', profile.personas),
			populate('boards', profile.boards),
			populate('notes', profile.notes),
			populate('files', profile.files),
			populate('invites', profile.invites)
		])
			.then(function() {
				turtl.sync.set({sync_id: profile.sync_id});
				return turtl.sync.save();
			});
	},

	/**
	 * When we get a set of profile data, load it incrementally here.
	 *
	 * this function also does some basic setup, such as selecting the first
	 * board as the current board.
	 */
	load_from_data: function(data, options)
	{
		options || (options = {});

		var keychain = this.get('keychain');
		var personas = this.get('personas');
		var boards = this.get('boards');
		var notes = this.get('notes');
		var invites = this.get('invites');

		// import the keychain first, since decrypting just about anything
		// requires it.
		return keychain.reset_async(data.keychain)
			.bind(this)
			.then(function() {
				return personas.reset_async(data.personas);
			})
			.then(function() {
				return boards.reset_async(data.boards);
			})
			.then(function() {
				return invites.reset_async(data.invites);
			})
			.then(function() {
				this.loaded = true;
			});
	},

	/**
	 * Decrypt all the in-memory collections we're tracking (keychain, personas,
	 * boards)
	 */
	load_deserialized: function()
	{
		var run_dec = function(type)
		{
			return Promise.all(this.get(type).map(function(model) {
				return model.deserialize().bind(this)
					.catch(function(err) {
						if(type == 'personas')
						{
							barfr.barf(i18next.t('There was a problem decrypting your persona. You might need to create a new one.'));
							return;
						}
						throw err;
					});
			}.bind(this))).bind(this)
				.catch(function(err) {
				});
		}.bind(this);
		return run_dec('keychain')
			.then(run_dec.bind(this, 'personas'))
			.then(run_dec.bind(this, 'boards'));
	},

	calculate_size: function(options)
	{
		if(!turtl.db) return false;

		options || (options = {});

		var profile_size = 0;
		return turtl.db.boards.query('user_id').only(turtl.user.id()).execute()
			.bind(this)
			.map(function(board) {
				return turtl.db.notes.query('board_id').only(board.id).execute()
					.map(function(note) {
						profile_size += note.body.length;
						if(note.file && note.file.size)
						{
							profile_size += note.file.size;
						}
					});
			})
			.then(function() {
				if(options.always_trigger)
				{
					this.set({size: profile_size}, {silent: true});
					this.trigger('change:size');
				}
				else
				{
					this.set({size: profile_size}, options);
				}
				return profile_size;
			})
			.catch(function(err) {
				log.error('profile: calculate_size: problem grabbing notes for board: ', board.id, derr(err));
				throw err;
			});
	},

	get_current_board: function()
	{
		var cur = this.get('current_board', false);
		if(!cur) cur = this.get('boards').first();
		return cur;
	},

	set_current_board: function(obj, options)
	{
		options || (options = {});
		return this.set({current_board: obj}, options);
	}
});

