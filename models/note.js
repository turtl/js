var Note = Protected.extend({
	base_url: '/notes',

	relations: {
		tags: {
			type: Composer.HasMany,
			collection: 'Tags'
		},
		file: {
			type: Composer.HasOne,
			model: 'NoteFile'
		}
	},

	public_fields: [
		'id',
		'user_id',
		'board_id',
		'file',
		'has_file',
		'keys',
		'body',
		'meta',
		'sort',
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

	// bad hack to fix annoying problem: when note data is set, the NoteFile sub
	// object doesn't have the note's key. by the time the key is set, the file
	// data has already came and left, leaving a false body in its wake. this
	// variable stores the file data until a key is available
	_tmp_file_data: false,

	// lets us disable monitoring of file events
	disable_file_monitoring: false,

	init: function()
	{
		var save_old = function() {
			// keep a delayed record of the last tag set
			(function() {
				this.set({old_tags: this.get('tags').map(function(t) {
					return t.get('name');
				})}, {silent: true});
			}).delay(0, this);
		}.bind(this);
		this.bind('change:tags', save_old);
		save_old();

		this.bind_relational('file', ['change:hash'], function() {
			if(this.is_new() || this.disable_file_monitoring) return false;

			if(this.get('file').get('blob_url'))
			{
				//URL.revokeObjectURL(this.get('file').get('blob_url'));
			}

			var has_file	=	this.get('file').get('hash') ? 1 : 0;
			this.set({has_file: has_file});
			if(!this.raw_data)
			{
				// make sure we update the note record to reflect our has_file
				// value in the db
				//
				// NOTE: we do *NOT* do note.save() here because if another save
				// is in progress, it will be interfered with, causing some
				// very weird problems. just run the update manually...
				turtl.db.notes
					.query()
					.only(this.id())
					.modify({has_file: has_file})
					.execute()
					.fail(function(e) {
						console.error('note: set has_file: ', e)
					});
			}
		}.bind(this));

		this.bind_relational('file', ['change:hash', 'change:has_data'], function() {
			if(this.disable_file_monitoring) return false;

			// generate a preview
			if(this.get('file').get('type', '').match(/^image/))
			{
				this.get('file').to_blob({
					success: function(blob) {
						this.get('file').set({blob_url: URL.createObjectURL(blob)+'#name='+this.get('file').get('name')});
						this.trigger('change', this);
					}.bind(this),
					error: function(e) {
						if(!e) return false;
						console.error('note: file: problem converting to blob: ', e);
					}.bind(this)
				});
			}
		}.bind(this));

		this.bind('destroy', function() {
			if(this.disable_file_monitoring) return false;
			this.clear_files();
		}.bind(this));

		this.get('file').trigger('change:hash');
	},

	destroy: function()
	{
		if(this.get('file').get('blob_url'))
		{
			URL.revokeObjectURL(this.get('file').get('blob_url'));
		}
		return this.parent.apply(this, arguments);
	},

	ensure_key_exists: function()
	{
		var key	=	this.parent.apply(this, arguments);
		if(key)
		{
			this.get('file').key	=	key;
			if(this._tmp_file_data)
			{
				this.set({file: this._tmp_file_data});
				this._tmp_file_data	=	false;
			}
		}
		return key;
	},

	generate_key: function()
	{
		var key					=	this.parent.apply(this, arguments);
		this.get('file').key	=	key;
		return key;
	},

	set: function(data)
	{
		if(data.file && !this.key)
		{
			this._tmp_file_data	=	data.file;
		}
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
		var url	=	this.id(true) ?
						'/notes/'+this.id() :
						'/boards/'+this.get('board_id')+'/notes';
		return url;
	},

	toJSON: function()
	{
		var data	=	this.parent.apply(this, arguments);
		if(!this.get('file') || !this.get('file').get('hash')) delete data.file;
		return data;
	},

	save: function(options)
	{
		options || (options = {});

		var args	=   {};
		if(options.api_save)
		{
			var meta	=   this.get('meta');
			if(meta && meta.persona)
			{
				args.persona	=   meta.persona;
			}
			options.args	=	args;
		}
		else
		{
			options.table	=	'notes';

			var board	=	turtl.profile.get('boards').find_by_id(this.get('board_id'));
			if(!board)
			{
				if(options.error) options.error('Problem finding board for that note.');
				return false;
			}

			if(board.get('shared', false) && this.get('user_id') != turtl.user.id())
			{
				var persona		=	board.get_shared_persona();
				args.persona	=	persona.id();
			}
			options.args	=	args;
		}
		return this.parent.call(this, options);
	},

	destroy: function(options)
	{
		options || (options = {});
		var args		=	{};

		if(options.api_save)
		{
			var args	=	{};
			var meta	=	this.get('meta');
			if(meta && meta.persona)
			{
				args.persona	=	meta.persona;
			}
			options.args	=	args;
		}
		else
		{
			options.table	=	'notes';

			var board	=	turtl.profile.get('boards').find_by_id(this.get('board_id'));
			if(!board)
			{
				if(options.error) options.error('Problem finding board for that note.');
				return false;
			}

			if(board.get('shared', false) && this.get('user_id') != turtl.user.id())
			{
				var persona		=	board.get_shared_persona();
				args.persona	=	persona.id();
			}
			options.args	=	args;

			if(this.get('file').get('hash'))
			{
				this.clear_files();
			}
		}
		return this.parent.call(this, options);
	},

	// remove all file records attached to this note
	clear_files: function(options)
	{
		options || (options = {});

		turtl.db.files.removeOnIndex('note_id', this.id())
			.done(options.success || function() {})
			.fail(options.error || function() {});
	},

	find_key: function(keys, search, options)
	{
		options || (options = {});
		search || (search = {});
		var board_id = this.get('board_id');
		var board_key = turtl.profile.get('boards').find_by_id(board_id).key;
		if(!search.b && board_id && board_key)
		{
			search.b = [{id: board_id, k: board_key}];
		}
		var ret = this.parent(keys, search, options);
		return ret;
	},

	// a hook function, called on a remote model when we get a server-generated
	// ID.
	sync_post_create: function()
	{
		var hash	=	this.get('file').get('hash');
		if(!hash) return;

		// if the file exists, update it to have local_change = 1 so it'll be
		// synced.
		turtl.db.files.query()
			.only(hash)
			.modify({local_change: 1, note_id: this.id()})
			.execute()
			.fail(function(e) {
				console.error('Error uploading file: ', hash, e);
			});
	}
});

var Notes = SyncCollection.extend({
	model: Note,
	local_table: 'notes',

	sortfn: function(a, b) { return a.id().localeCompare(b.id()); },

	// used for tracking batch note saves
	batch_track: null,

	/*
	start_batch_save: function()
	{
		this.batch_track	=	[];
		this.bind('change', function(note) {
			this.batch_track.push(note);
		}.bind(this), 'notes:collection:batch_track:change');
	},

	finish_batch_save: function(options)
	{
		options || (options = {});
		this.unbind('change', 'notes:collection:batch_track:change');
		if(this.batch_track.length == 0) return;

		var save	=	this.batch_track.map(function(note) {
			// we really only care about the id/body
			return {id: note.id(), body: note.toJSON().body};
		});
		// corpses
		var args	=	{data: save};
		if(options.shared && options.persona)
		{
			args.persona	=	options.persona.id();
		}
		turtl.api.put('/notes/batch', args, {
			success: options.success,
			error: options.error
		});

		this.batch_track	=	[];
	},
	*/

	process_local_sync: function(note_data, note)
	{
		if(note_data.deleted)
		{
			if(note) note.destroy({skip_local_sync: true, skip_remote_sync: true});
		}
		else if(note)
		{
			note.set(note_data);
		}
		else
		{
			var note	=	new Note(note_data);
			if(note_data.cid) note._cid	=	note_data.cid;
			this.upsert(note);
		}
	},

	sync_to_api: function()
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
			.done(function(res) {
				res.each(function(notedata) {
					if(!notedata || !notedata.file || !notedata.file.hash) return false;

					var filedata	=	{
						id: notedata.file.hash,
						note_id: notedata.id,
						has_data: 0
					};
					turtl.db.files.get(filedata.id).done(function(file) {
						// mark note as definitely having file record
						turtl.db.notes
							.query()
							.only(notedata.id)
							.modify({has_file: 2})
							.execute()
							.fail(function(e) {
								console.error('sync: '+ this.local_table +': set has_file = 2', e);
							}.bind(this));
						// no need to mess with the file record if we've got one already
						if(file) return false;
						// file record doesn't exist! add it.
						turtl.db.files.update(filedata).fail(function(e) {
							console.error('sync: ', this.local_table +': insert file record: ', e);
						}.bind(this));
					}.bind(this));
				}.bind(this));
			}.bind(this))
			.fail(function(e) {
				console.error('sync: '+ this.local_table +': add file records: ', e);
			});

		// go running to mommy
		return this.parent.apply(this, arguments);
	}
});

var NotesFilter = Composer.FilterCollection.extend({
});

