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
		'meta',
		'mod'
	],

	private_fields: [
		'type',
		'title',
		'tags',
		'url',
		'text',
		'embed',
		'color',
	],

	// lets us disable monitoring of file events
	disable_file_monitoring: false,

	init: function()
	{
		// if the note is destroyed or edited, update the index
		this.bind('destroy', turtl.search.unindex_note.bind(turtl.search));
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
	},

	init_new: function(options)
	{
		options || (options = {});

		var data = {user_id: turtl.user.id()};

		this.generate_key();
		var board = turtl.profile.get('boards').find_by_id(options.board_id);
		var parent_id = board ? board.get('parent_id') : false;
		var parent = turtl.profile.get('boards').find_by_id(parent_id);
		if(board)
		{
			var subkeys = [{b: board.id(), k: board.key}];
			if(parent) subkeys.push({b: parent.id(), k: parent.key});
			this.generate_subkeys(subkeys);
			data.boards = [board.id()];
		}
		this.set(data, options);
		return turtl.profile.get('keychain').add_key(this.id(), 'note', this.key);
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
		if(!options.get_file && (!this.get('file') || (!this.get('file').get('hash') && !this.get('file').get('encrypting'))))
		{
			delete data.file;
		}
		return data;
	},

	save: function(options)
	{
		options || (options = {});

		var args = {};
		if(options.api_save)
		{
			var meta = this.get('meta');
			if(meta && meta.persona)
			{
				args.persona = meta.persona;
			}
			options.args = args;
		}
		else
		{
			options.table = 'notes';
		}
		return this.parent.call(this, options);
	},

	destroy: function(options)
	{
		options || (options = {});
		var args = {};

		if(options.api_save)
		{
			var args = {};
			var meta = this.get('meta');
			if(meta && meta.persona)
			{
				args.persona = meta.persona;
			}
			options.args = args;
		}
		else
		{
			if(this.get('file').get('blob_url'))
			{
				URL.revokeObjectURL(this.get('file').get('blob_url'));
			}

			if(this.get('file').get('hash'))
			{
				this.clear_files();
			}
		}
		return this.parent(options);
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

	find_key: function(keys, search, options)
	{
		options || (options = {});
		search || (search = {});
		search.b || (search.b = []);

		var board_ids = this.get('boards') || [];
		board_ids.forEach(function(board_id) {
			var board_key = turtl.profile.get('boards').find_by_id(board_id).key;
			if(board_key) search.b.push({id: board_id, k: board_key});
		}.bind(this));
		return this.parent(keys, search, options);
	},

	// a hook function, called on a remote model when we get a server-generated
	// ID.
	sync_post_create: function()
	{
		var hash = this.get('file').get('hash');
		if(!hash) return;

		turtl.db.files.query()
			.only(hash)
			.modify({note_id: this.id()})
			.execute()
			.then(function(filedata) {
				if(!filedata || !filedata[0]) return false;
				filedata = filedata[0];
				delete filedata.body;
				turtl.sync.queue_remote_change('files', 'create', filedata);
			})
			.catch(function(err) {
				log.error('Error uploading file: ', hash, derr(err));
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
	 */
	load_and_deserialize: function(note_ids, options)
	{
		return Promise.all(note_ids.map(function(id) {
			if(this.find_by_id(id)) return true;
			var note;
			return turtl.db.notes.get(id).bind(this)
				.then(function(notedata) {
					if(!notedata) return false;
					note = new Note(notedata);
					return note.deserialize(options);
				})
				.then(function() {
					this.add(note, options);
				});
		}.bind(this)));
	},

	start: function()
	{
		// poll for notes that have files (but no file record) and create dummy
		// records
		turtl.sync.register_poller(this.create_dummy_file_records.bind(this))
	},

	create_dummy_file_records: function()
	{
		// this code creates empty file records in the files table from notes
		// that we know have file data
		//
		// what we do here is search for notes with has_file = 1 (0 is does not
		// have a file, 1 is has a file but not sure if the file record exists
		// in the files table, and 2 is note has a file and file record is 
		// definitely in the files table)
		turtl.db.notes
			.query('has_file')
			.only(1)		// only query notes that we're uncertain if it has matching file record
			.execute()
			.then(function(res) {
				res.each(function(notedata) {
					if(!notedata || !notedata.file || !notedata.file.hash) return false;

					var filedata = {
						id: notedata.file.hash,
						note_id: notedata.id,
						has_data: 0
					};
					turtl.db.files.get(filedata.id).then(function(file) {
						// mark note as definitely having file record
						turtl.db.notes
							.query()
							.only(notedata.id)
							.modify({has_file: 2})
							.execute()
							.catch(function(err) {
								log.error('sync: notes: set has_file = 2', derr(err));
							}.bind(this));
						// no need to mess with the file record if we've got one already
						if(file) return false;
						// file record doesn't exist! add it.
						turtl.db.files.update(filedata).catch(function(err) {
							log.error('sync: files: insert file record: ', derr(err));
						}.bind(this));
					}.bind(this));
				}.bind(this));
			}.bind(this))
			.catch(function(err) {
				log.error('sync: '+ this.local_table +': add file records: ', derr(err));
			});
	}
});

