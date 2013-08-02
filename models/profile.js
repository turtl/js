var Profile = Composer.RelationalModel.extend({
	relations: {
		boards: {
			type: Composer.HasMany,
			collection: 'Boards',
			forward_events: true
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
		this.bind_relational('boards', ['add', 'remove', 'reset', 'change', 'note_change'], function() {
			this.persist();
		}.bind(this));
		this.persist_timer		=	new Timer(200);
		this.persist_timer.end	=	false;
	},

	load_data: function(options)
	{
		var success = function(profile, from_storage)
		{
			from_storage || (from_storage = false);

			this.profile_data = true;
			tagit.user.set(profile.user);
			if(options.init)
			{
				//this.clear({silent: true});
				this.load(profile, Object.merge({}, options, {
					complete: function() {
						if(options.success) options.success(profile, from_storage);
					}.bind(this)
				}));
			}
			else if(options.success)
			{
				options.success(profile, from_storage);
			}
		}.bind(this);

		if(profile = this.from_persist())
		{
			(function () { success(profile, true); }).delay(0);
		}
		else
		{
			tagit.api.get('/profiles/users/'+tagit.user.id(), {}, {
				success: function(profile) {
					success(profile, false);
				},
				error: function(err) {
					barfr.barf('Error loading user profile: '+ err);
					if(options.error) options.error(e);
				}
			});
		}
	},

	load: function(data, options)
	{
		options || (options = {});
		var boards = this.get('boards');
		var board_data = data.boards;
		boards.load_boards(board_data, Object.merge({}, options, {
			complete: function() {
				var board = null;
				this.loaded = true;
				if(options.board)
				{
					board = this.get('boards').find(function(p) {
						return p.id() == options.board.clean();
					});
				}
				if(!board) board = this.get('boards').first();
				if(board) this.set_current_board(board);
				if(options.complete) options.complete();
			}.bind(this)
		}));
	},

	/**
	 * Grab all profile/persona profile data and init it into this profile
	 * object.
	 */
	initial_load: function(options)
	{
		options || (options = {});
		this.load_data({
			init: true,
			success: function(_, from_storage) {
				tagit.user.load_personas({
					success: function(prof) {
						// message data can be loaded independently once personas
						// are loaded, so do it
						tagit.messages.sync();

						// this function gets called when all profile/persona data
						// has been loaded
						var finish	=	function()
						{
							if(options.complete) options.complete();
						};

						var num_personas	=	tagit.user.get('personas').models().length;

						// if we loaded from storage, we already have all the
						// persona profile junk, so don't bother loading it
						if(num_personas > 0 && !from_storage)
						{
							// wait for all personas to load their profiles before
							// finishing the load
							var i		=	0;
							var track	=	function()
							{
								i++;
								if(i >= num_personas) finish();
							};

							// loop over each persona and load its profile data
							tagit.user.get('personas').each(function(p) {
								p.load_profile({
									success: function() {
										track();
									},
									error: function(err) {
										barfr.barf('Error loading the profile data for your persona "'+p.get('screenname')+'":'+ err);
										// don't want to freeze the app just because one
										// persona doesn't load, do we?
										track();
									}
								});
							});
						}
						else
						{
							// no personas to load (or we loaded all the profile
							// data from locstor newayz), just finish up the load
							finish();
						}
					}
				});
			}
		});
	},

	get_current_board: function()
	{
		return this.get('current_board', false);
	},

	set_current_board: function(obj, options)
	{
		options || (options = {});
		if(typeOf(obj) == 'string')
		{
			obj	=	this.get('boards').find_by_id(obj);
		}
		if(!obj) return false;
		return this.set({current_board: obj}, options);
	},

	/**
	 * Keeps track of items to IGNORE when a sync happens
	 */
	track_sync_changes: function(id)
	{
		this.sync_ignore.push(id);
	},

	sync: function(options)
	{
		options || (options = {});
		if(!tagit.sync || !tagit.user.logged_in) return false;

		var sync_time = this.get('sync_time', 9999999);
		tagit.api.post('/sync', {time: sync_time}, {
			success: function(sync) {
				this.set({sync_time: sync.time});
				this.process_sync(sync);
				// reset ignore list
				this.sync_ignore	=	[];
			}.bind(this),
			error: function(e, xhr) {
				if(xhr.status == 0)
				{
					barfr.barf(
						'Error connecting with server. Your changes may not be saved.<br><br><a href="#" onclick="window.location.reload()">Try reloading</a>.',
						{message_persist: 'persist'}
					);
				}
				else
				{
					barfr.barf('Error syncing user profile with server: '+ e);
				}
				if(options.error) options.error(e);
			}.bind(this)
		});

		tagit.messages.sync({
			success: function(_, persona) {
				persona.sync_data(sync_time);
			}
		});
	},

	process_sync: function(sync)
	{
		sync.notes.each(function(note_data) {
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
			else if(!note_data.deleted)
			{
				newboard.get('notes').add(note_data);
			}
		}.bind(this));

		sync.boards.each(function(board_data) {
			// don't sync ignored items
			if(this.sync_ignore.contains(board_data.id))
			{
				this.sync_ignore.erase(board_data.id);
				return false;
			}

			var board	=	tagit.profile.get('boards').find_by_id(board_data.id);
			if(!board) return;
			if(board_data.deleted)
			{
				board.destroy({skip_sync: true});
			}
			else
			{
				board.set(board_data);
			}
		}.bind(this));
		this.persist();
	},

	get_sync_time: function()
	{
		if(this.get('sync_time', false)) return;

		tagit.api.get('/sync', {}, {
			success: function(time) {
				this.set({sync_time: time});
			}.bind(this),
			error: function(e) {
				barfr.barf('Error syncing user profile with server: '+ e);
			}.bind(this)
		});
	},

	persist: function(options)
	{
		if(!tagit.mirror) return false;

		options || (options = {});

		if(!this.persist_timer.end)
		{
			this.persist_timer.end	=	function()
			{
				var store	=	{
					user: tagit.user.toJSON(),
					boards: []
				};
				tagit.profile.get('boards').each(function(board) {
					var boardobj	=	board.toJSON();
					boardobj.notes	=	board.get('notes').toJSON();
					store.boards.push(boardobj);
				});
				var tsnow	=	Math.floor(new Date().getTime()/1000);
				store.time	=	this.get('sync_time', tsnow);
				localStorage['profile:user:'+tagit.user.id()]	=	JSON.encode(store);
				localStorage['scheme_version']					=	config.mirror_scheme_version;
				addon_comm.send('provile-save', store);
			}.bind(this);
		}
		if(options.now)
		{
			this.persist_timer.end();
		}
		else
		{
			this.persist_timer.start();
		}
	},

	from_persist: function()
	{
		if(!tagit.mirror) return false;

		if((localStorage['scheme_version'] || 0) < config.mirror_scheme_version)
		{
			localStorage.clear();
			return false;
		}
		var data	=	localStorage['profile:user:'+tagit.user.id()] || false
		if(data) data = JSON.decode(data);
		if(data && data.time) this.set({sync_time: data.time});
		return data;
	}
});

