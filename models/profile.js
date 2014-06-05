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

				// once we have all our data, populate the profile with it
				this.load_from_data(profile_data, options);
				this.trigger('populated');
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
							// process the data through the sync system
							profile	=	turtl.sync.process_data(profile);

							// create file records from note records
							// TODO: determine if this is necessary. from my
							// understanding, all one has to do is set note.has_file
							// = 1 for a file record to be created for that note.
							// was this done for performance reasons?
							profile.files	=	(profile.notes || [])
								.filter(function(note) { return note.file && note.file.hash; })
								.map(function(note) {
									return {
										id: note.file.hash,
										note_id: note.id,
										has_data: 0
									};
								});

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
					return finished();
					/**
					 * NOTE: this is ALL WRONG. we can't use a sync id from the DB
					 * as the last sync id, we need to use a locally stored value.
					 * also, wiping the profile after a month of not syncing is
					 * the Wrong Thing (tm). we need a popup that tells the user
					 * they are out of sync and give them an option to export
					 * their data before syncing
					 *
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
					*/
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
		populate('files', profile.files, {complete: complete_fn('files')});
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
				personas.reset_async(data.personas, {
					complete: function() {
						boards.reset_async(data.boards, {
							complete: function() {
								// save some performance here by not tracking tags while updating
								boards.each(function(b) { b.track_tags(false); });
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

	calculate_size: function(options)
	{
		options || (options = {});

		var profile_size		=	0;
		var num_boards			=	0;
		var boards_processed	=	0;

		var finished	=	function()
		{
			boards_processed++;
			if(boards_processed < num_boards) return;
			if(options.success) options.success(profile_size);
			if(options.always_trigger)
			{
				this.set({size: profile_size}, {silent: true});
				this.trigger('change:size');
			}
			else
			{
				this.set({size: profile_size}, options);
			}
		}.bind(this);

		turtl.db.boards.query('user_id').only(turtl.user.id()).execute()
			.done(function(boards) {
				num_boards	=	boards.length;
				boards.each(function(board) {
					turtl.db.notes.query('board_id').only(board.id).execute()
						.done(function(notes) {
							notes.each(function(note) {
								profile_size	+=	note.body.length;
								if(note.file && note.file.size)
								{
									profile_size	+=	note.file.size;
								}
							});
							finished();
						})
						.fail(function(e) {
							log.error('profile: calculate_size: problem grabbing notes for board: ', board.id, e);
							if(options.error) options.error(e);
						});
				});
			})
			.fail(function(e) {
				log.error('profile: calculate_size: problem grabbing user\'s boards: ', e);
				if(options.error) options.error(e);
			});
		turtl.db.boards.query()
		return profile_size;
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
	}
});

