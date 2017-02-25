var Note = Protected.extend({
	base_url: '/notes',

	relations: {
		tags: { collection: 'Tags' },
		file: { model: 'NoteFile' }
	},

	public_fields: [
		'id',
		'user_id',
		'boards',
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

		// if the note is destroyed or edited, update the index
		this.bind('destroy', turtl.search.unindex_note.bind(turtl.search, this));
		this.bind('change', function() {
			if(!this.id(true)) return;
			turtl.search.reindex_note(this);
		}.bind(this));
		var set_mod = function()
		{
			if(this.get('mod')) return;
			var mod = id_timestamp(this.id(), {unix: true});
			this.set({mod: mod}, {silent: true});
		}.bind(this);
		this.bind('change:id', set_mod);
		set_mod();

		this.bind('destroy', function() {
			if(this.disable_file_monitoring) return false;
			this.clear_files();
		}.bind(this));

		this.bind('change:id', function() {
			var id = this.id();
			if(id.match(old_id_match))
			{
				var ts = parseInt(id.substr(0, 8), 16)
			}
			else
			{
				var ts = parseInt(id.substr(0, 12), 16) / 1000;
			}
			this.set({created: ts}); //, {silent: true};
		}.bind(this));
		this.trigger('change:id');
	},

	update_keys: function(options)
	{
		options || (options = {});

		this.set({user_id: turtl.user.id()}, options);

		var board_id = this.get('board_id');
		var subkeys = [];
		var board = turtl.profile.get('boards').get(board_id);
		if(board) subkeys.push({b: board.id(), k: board.key});

		// make sure we do this BEFORE generate_subkeys(). the reason is that
		// many times, update_keys() gets called from save() from a board being
		// deleted. by the time we get here, the note no longer has the board in
		// note.boards[] however the note.keys[] collection still has the board
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

	destroy: function(options)
	{
		options || (options = {});
		var args = {};

		this.get('file').revoke()

		var promise = Promise.resolve();
		if(this.get('file').id())
		{
			promise = this.clear_files();
		}
		var parentfn = this.$get_parent();
		return promise.then(parentfn.bind(this, options));
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
		var keychain = turtl.profile.get('keychain');
		var boards = turtl.profile.get('boards');
		board_ids.forEach(function(board_id) {
			var board = boards.get(board_id);
			if(!board) return;
			search.upsert_key(board.id(), 'board', board.key, {skip_save: true});
		});
		return search;
	},

	// a hook function, called on a remote model when we get a server-generated
	// ID.
	sync_post_create: function()
	{
		var id = this.get('file').id();
		if(!id) return;

		turtl.db.files.query()
			.only(id)
			.modify({note_id: this.id()})
			.execute()
			.then(function(filedata) {
				if(!filedata || !filedata[0]) return false;
				filedata = filedata[0];
				delete filedata.body;
				turtl.sync.queue_remote_change('files', 'create', filedata);
			})
			.catch(function(err) {
				log.error('Error uploading file: ', id, derr(err));
			});
	}
});

var Notes = SyncCollection.extend({
	model: Note,
	local_table: 'notes',

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

	/**
	 * we need a version of this function that correctly sniffs out the proper
	 * action on "edit" when dealing with a shared note.
	 *
	 * for isntance, if a note is edited, and it's shared by someone else, and
	 * the note no longer contains in its keys any of the boards we have in data
	 * then the note was essentially "unshared" from us.
	 *
	 * conversely if a note is edited, and it's shared, and it does NOT exist in
	 * data currently, we should add (upsert) it because it was moved into one
	 * of our boards
	 */
	run_incoming_sync_item: function(sync, item)
	{
		var promise = false;
		if(sync.action == 'edit' && item.shared)
		{
			var board_ids = turtl.profile.get('boards').map(function(b) { return b.id(); });
			var board_idx = make_index(board_ids);
			// determine if the model is any in-mem boards
			var in_board = false;
			(item.boards || []).forEach(function(b) { in_board = board_idx[b]; });
			var model = this.get(item.id);
			if(model)
			{
				// ok, we have an existing in-mem model. if it's in any in-mem
				// boards, matches, then upsert the data. if it isn't a member
				// of any in-mem boards, then the only thing that's left is that
				// is was edited to be removed from the board in question and
				// should be destroyed locally
				if(in_board)
				{
					var temp = new this.model(item);
					promise = temp.deserialize().bind(this)
						.then(function() {
							model.set(temp.toJSON());
						});
				}
				else
				{
					promise = model.destroy({skip_remote_sync: true});
				}
			}
			else
			{
				model = new this.model(item);
				promise = model.deserialize().bind(this)
					.then(function() {
						// yes, upsert.
						// see SyncCollection.run_incoming_sync (models/_sync.js)
						// if you REALLLLLYY need a full sexplanation
						this.upsert(model);
					})
					// check if we have a file attached to this new (shared) note.
					// if so, create a dummy file record and then trigger the
					// download
					.tap(function() {
						var file_id = model.get('file').id(true);
						if(!file_id) return;

						var file = new FileData({id: file_id, note_id: model.id()});
						return file.save({skip_serialize: true, skip_remote_sync: true})
							.then(function() {
								var filejob = {id: file_id};
								return turtl.hustle.Queue.put(filejob, {tube: 'files:download', ttr: 300});
							});
					});
			}
			if(promise) return promise;
		}
		return this.parent.apply(this, arguments);
	}
});

