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
			collection: 'Notes',
			options: {
				forward_all_events: true,
				refresh_on_change: false
			}
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
	load: function(options)
	{
		options || (options = {});

		// check if we need to download the profile (first-run). we do this by
		// grabbing the last sync time. if present, then yes, syncing has
		// already been setup on this client, otherwise we load the profile into
		// the db, set the sync time record, and continue loading.
		this.profile_data = true;
		var profile_data = {};
		return turtl.db.user.get('user')
			.bind(this)
			.then(function(userdata) {
				turtl.user.set(userdata);
			})
			.then(function() {
				return ['keychain', 'personas', 'boards', 'notes'];
			})
			.map(function(itemname) {
				return turtl.db[itemname].query().filter().execute().then(function(res) {
					profile_data[itemname] = res;
				});
			})
			.then(function() {
				return this.load_from_data(profile_data, options);
			})
			.then(function() {
				this.trigger('populated');
			});
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
			populate('files', profile.files)
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
				boards.each(function(b) { b.track_tags(false); });
				return notes.reset_async(data.notes);
			})
			.then(function() {
				this.loaded = true;
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
				var board = null;
				if(options.board) board = boards.select_one({id: options.board.clean()});
				if(!board) board = boards.first();
				if(board) this.set_current_board(board);
			});
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
			.catch(function(e) {
				log.error('profile: calculate_size: problem grabbing notes for board: ', board.id, e);
				throw e;
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

