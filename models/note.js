var Note = SyncModel.extend({
	base_url: '/notes',

	relations: {
		tags: { collection: 'Tags' },
		file: { model: 'NoteFile' }
	},

	public_fields: [
		'id',
		'space_id',
		'board_id',
		'user_id',
		'file',
		'has_file',
		'keys',
		'mod'
	],

	private_fields: [
		'type',
		'title',
		'tags',
		'url',
		'username',
		'password',
		'text',
		'embed',
		'color',
	],

	// lets us disable monitoring of file events
	disable_file_monitoring: false,

	init: function(options)
	{
		options || (options = {});

		// we want the ability to create a new note without having it listen to
		// data changes and reindex itself or delete files or any of that
		// nonsense. this is usually because we're going to use one of it's
		// internal functions (such as clearing files) manually and need to
		// control the process by hand.
		if(options.bare) return;

		this.parent.apply(this, arguments);

		var set_mod = function()
		{
			if(this.get('mod')) return;
			var mod = id_timestamp(this.id(), {unix: true});
			this.set({mod: mod}, {silent: true});
		}.bind(this);
		this.bind('change:id', set_mod);
		set_mod();

		// if the note is destroyed or edited, update the index
		this.bind('destroy', function() {
			if(this.disable_file_monitoring) return false;
			// NOTE (ha ha): we skipt_remote_sync here because the server will
			// see our note.delete and create a file.delete sync record for us
			// automatically. wow!
			this.clear_files({skip_remote_sync: true});
		}.bind(this));

		this.bind('change:id', function() {
			var id = this.id();
			var ts = id_timestamp(id);
			this.set({created: ts});
		}.bind(this));
		this.trigger('change:id');
	},

	update_keys: function(options)
	{
		options || (options = {});

		this.set({user_id: turtl.user.id()}, options);

		var subkeys = [];

		var space_id = this.get('space_id');
		var space = turtl.profile.get('spaces').get(space_id);
		if(!space) throw new Error('Note.update_keys() -- bad space id: '+space_id);
		subkeys.push({s: space.id(), k: space.key});

		var board_id = this.get('board_id');
		var board = turtl.profile.get('boards').get(board_id);
		if(board) subkeys.push({b: board.id(), k: board.key});

		// make sure we do this BEFORE generate_subkeys(). the reason is that
		// many times, update_keys() gets called from save() from a board being
		// deleted. by the time we get here, the note no longer has the board in
		// note.board_id however the note.keys[] collection still has the board
		// key entry in it. we use that entry to find the board if needed when
		// finding the note's key.
		//
		// see Note.find_key() for more details
		var key = this.ensure_key_exists();
		if(!key) return Promise.reject(new Error('note: missing key: '+ this.id()));

		// ok, we have a key, we can update our subkeys now
		this.generate_subkeys(subkeys);
		return Promise.resolve();
	},

	ensure_key_exists: function()
	{
		var key = this.parent.apply(this, arguments);
		if(key)
		{
			this.get('file').key = key;
		}
		return key;
	},

	generate_key: function()
	{
		var key = this.parent.apply(this, arguments);
		this.get('file').key = key;
		return key;
	},

	set: function(data)
	{
		return this.parent.apply(this, arguments);
	},

	add_tag: function(tag)
	{
		var tags = this.get('tags');
		if(tags.find(function(t) { return t.get('name') == tag; })) return false;
		tags.add({name: tag});
		return true;
	},

	remove_tag: function(tag)
	{
		var tags = this.get('tags');
		var found = tags.select({name: tag});
		found.each(function(t) {
			tags.remove(t);
		});
	},

	has_tag: function(tagname)
	{
		return this.get('tags').find(function(t) {
			return t.get('name') == tagname;
		});
	},

	get_url: function()
	{
		var url = this.id(true) ?
						'/notes/'+this.id() :
						'/boards/'+this.get('board_id')+'/notes';
		return url;
	},

	toJSON: function(options)
	{
		options || (options = {});

		var data = this.parent.apply(this, arguments);
		if(!options.get_file && (!this.get('file') || (!this.get('file').id(true) && !this.get('file').get('encrypting'))))
		{
			delete data.file;
		}
		return data;
	},

	save: function(options)
	{
		options || (options = {});

		var parentfn = this.$get_parent();
		return this.update_keys(options).bind(this)
			.then(function() {
				options.table = 'notes';
				return parentfn.call(this, options);
			});
	},

	// remove all file records attached to this note
	clear_files: function(options)
	{
		options || (options = {});

		return turtl.db.files.query('note_id')
			.only(this.id())
			.execute()
			.then(function(files) {
				var actions = [];
				files.each(function(filedata) {
					if(options.exclude && options.exclude.contains(filedata.id)) return;
					delete filedata.body;
					var file = new FileData(filedata);
					actions.push(file.destroy(options));
				});
				return Promise.all(actions);
			});
	},

	get_key_search: function()
	{
		var space_ids = [this.get('space_id')];
		// also look in keys for space ids. they really shouldn't be in here if
		// not in note.spaces, but it's much better to find a key and be wrong
		// than to have a note you cannot decrypt and be right.
		this.get('keys').each(function(key) {
			var space_id = key.get('b');
			if(space_id && space_ids.indexOf(space_id) < 0)
			{
				space_ids.push(space_id);
			}
		});

		var board_ids = [this.get('board_id')];
		// also look in keys for board ids. they really shouldn't be in here if
		// not in note.boards, but it's much better to find a key and be wrong
		// than to have a note you cannot decrypt and be right.
		this.get('keys').each(function(key) {
			var board_id = key.get('b');
			if(board_id && board_ids.indexOf(board_id) < 0)
			{
				board_ids.push(board_id);
			}
		});

		var search = new Keychain();
		var spaces = turtl.profile.get('spaces');
		space_ids.forEach(function(space_id) {
			var space = spaces.get(space_id);
			if(!space) return;
			search.upsert_key(space.id(), 'space', space.key, {skip_save: true});
		});
		var boards = turtl.profile.get('boards');
		board_ids.forEach(function(board_id) {
			var board = boards.get(board_id);
			if(!board) return;
			search.upsert_key(board.id(), 'board', board.key, {skip_save: true});
		});
		return search;
	},

	move_spaces: function(new_space_id) {
		this.set({space_id: new_space_id});
		return this.save({custom_method: 'move-space'});
	},
});

var Notes = SyncCollection.extend({
	model: Note,
	sync_type: 'note',

	/**
	 * given an array of note ids, either a) load them from local db,
	 * deserialize them, and add them to this collection, or b) if they already
	 * exist in this collection, do nothing =]
	 *
	 * this goes hand in hand with the search model, which only returns IDs, and
	 * relies on another piece (this one) to load/decrypt the notes themselves.
	 */
	load_and_deserialize: function(note_ids, options)
	{
		var actions = note_ids.map(function(id) {
			if(this.get(id)) return true;
			return turtl.db.notes.get(id).bind(this)
		}.bind(this));
		return Promise.all(actions).bind(this)
			.map(function(notedata) {
				if(notedata === true) return true;
				var note = new Note(notedata);
				return note.deserialize()
					.then(function() { return note; })
					.catch(function(err) {
						if(note.is_crypto_error(err))
						{
							note.set({type: 'text', crypto_error: true});
							return note;
						}
						else
						{
							throw err;
						}
					});
			}).map(function(note) {
				if(!(note instanceof Composer.Model)) return;
				this.upsert(note, options);
			});
	},
});

