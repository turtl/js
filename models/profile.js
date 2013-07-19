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

	init: function()
	{
	},

	load_data: function(options)
	{
		tagit.api.get('/profiles/users/'+tagit.user.id(), {}, {
			success: function(profile) {
				this.profile_data = true;
				tagit.user.set(profile.user);
				if(options.init)
				{
					//this.clear({silent: true});
					this.load(profile, Object.merge({}, options, {
						complete: function() {
							if(options.success) options.success(profile);
						}.bind(this)
					}));
				}
				else if(options.success)
				{
					options.success(profile);
				}
			}.bind(this),
			error: function(err) {
				barfr.barf('Error loading user profile: '+ err);
				if(options.error) options.error(e);
			}
		});
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
			if(this.sync_ignore.contains(note_data.id)) return false;

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
	},

	get_sync_time: function()
	{
		tagit.api.get('/sync', {}, {
			success: function(time) {
				this.set({sync_time: time});
			}.bind(this),
			error: function(e) {
				barfr.barf('Error syncing user profile with server: '+ e);
			}.bind(this)
		});
	}
});

