var NoteFile = Protected.extend({
	base_url: '/files',

	defaults: {
		synced: 0
	},

	public_fields: [
		'hash',
		'size',
		'upload_id',
		'has_data'
	],

	private_fields: [
		'name',
		'type'
	],

	find_key: function()
	{
		var note	=	this && this.get_parent && this.get_parent();
		if(note)
		{
			this.key	=	note.key;
			return this.key;
		}
		return this.parent.apply(this, arguments);
	},

	to_array: function(options)
	{
		options || (options = {});

		if(!this.get('hash')) return false;

		turtl.db.files.get(this.get('hash'))
			.done(function(filedata) {
				if(!filedata)
				{
					if(options.error) options.error(false);
					this.set({has_data: 0});
					return false;
				}
				var file	=	new FileData();
				file.key	=	this.key;
				file.set(filedata, {
					async_success: function() {
						var data	=	file.get('data');
						var buffer	=	new ArrayBuffer(data.length);
						var array	=	new Uint8Array(buffer);
						for(var i = 0, n = data.length; i < n; i++)
						{
							array[i]	=	data.charCodeAt(i);
						}
						if(options.success) options.success(array);
					}.bind(this)
				});
			}.bind(this))
			.fail(function(e) {
				if(options.error) options.error(e);
			})
	},

	to_blob: function(options)
	{
		options || (options = {});

		return this.to_array({
			success: function(array) {
				if(options.success) options.success(new Blob([array.buffer], {type: this.get('type')}))
			}.bind(this),
			error: options.error
		});
	}
});

var FileData = ProtectedThreaded.extend({
	base_url: '/files',

	public_fields: [
		'id',
		'note_id',
		'synced',
		'has_data'
	],

	private_fields: [
		'data'
	],

	save: function(options)
	{
		options || (options = {});

		if(options.api_save)
		{
			var data	=	this.toJSON();
			// don't try to upload until we have a real note id
			if(!data.note_id || !data.note_id.match(/[0-9a-f]+/)) return false;
			var body	=	data.body;
			var data	=	{
				hash: data.id,
				cid: this.cid()
			};

			// convert body to Uint8Array
			var raw	=	new Uint8Array(body.length);
			for(var i = 0, n = body.length; i < n; i++)
			{
				raw[i]	=	body.charCodeAt(i);
			}

			// mark the save as raw and fire it off
			options.rawUpload	=	true;
			options.data		=	raw;
			options.args		=	data;
			this.url			=	'/notes/'+this.get('note_id')+'/file';
			options.uploadprogress	=	function(ev) {
				console.log('progress: ', ev);
			};
			var save_fn	=	get_parent(this);
			return turtl.files.upload(this, save_fn, options);
			//return this.parent.apply(this, arguments);
		}
		else
		{
			return this.parent.apply(this, arguments);
		}
	},

	/**
	 * download a file's contents from the API and also notify the owning note
	 * that the file contents are ready to go.
	 */
	download: function(options)
	{
		options || (options = {});

		if(!this.get('note_id') || !this.get('id')) return false;
		turtl.api.get('/notes/'+this.get('note_id')+'/file', {hash: this.get('id')}, {
			responseType: 'arraybuffer',
			success: function(res) {
				var body	=	uint8array_to_string(res);

				this.set({data: body});

				var hash	=	this.id();
				var data	=	{
					id: hash,
					note_id: this.get('note_id'),
					body: body,
					synced: 1,
					has_data: 1
				};

				// save the file data into the db
				turtl.db.files.update(data)
					.done(function() {
						// now update the note so it knows it has file contents
						turtl.db.notes
							.query()
							.only(this.get('note_id'))
							.modify({
								file: function(n) {
									n.file.hash		=	hash;
									// increment has_file. this notifies the in-mem
									// model to reload.
									n.file.has_data	=	n.file.has_data < 1 ? 1 : n.file.has_data + 1;
									return n.file;
								},
								last_mod: new Date().getTime(),
								has_file: 2
							})
							.execute()
							.done(function() {
								if(options.success) options.success(this);
							}.bind(this))
							.fail(function(e) {
								console.error('file: download: save error: ', e);
								if(options.error) options.error(e);
							});
					}.bind(this))
					.fail(function(e) {
						console.error('file: download: save error: ', e);
						if(options.error) options.error(e);
					});
			}.bind(this),
			progress: options.progress,
			error: options.error
		});
	}
});

var Files = SyncCollection.extend({
	model: FileData,
	local_table: 'files',

	// used to track which files are currently downloading to this client.
	downloads: {},
	// used to track which files are currently uploading from this client.
	uploads: {},

	update_record_from_api_save: function(modeldata, record, options)
	{
		options || (options = {});

		if(_sync_debug_list.contains(this.local_table))
		{
			console.log('save: '+ this.local_table +': api -> db ', modeldata);
		}

		// note that we don't need all the cid renaming heeby jeeby here since
		// we already have an id (the hash) AND the object we're attaching to
		// (teh note) must always have an id before uploading. so instead, we're
		// going to update the model data into the note's [file] object.
		var note_id	=	modeldata.note_id;
		var hash	=	modeldata.id;
		turtl.db.files
			.query()
			.only(hash)
			.modify({synced: 1, has_data: 1})
			.execute()
			.done(function() {
				turtl.db.notes
					.query()
					.filter('id', note_id)
					.modify({
						file: function(note) {
							note.file.hash		=	hash;
							note.file.has_data	=	1;
							return note.file;
						},
						last_mod: new Date().getTime()
					})
					.execute()
					.done(function() {
						if(options.success) options.success();
					})
					.fail(function(e) {
						console.error('file: error setting note.last_mod', e);
						if(options.error) options.error(e);
					});
			})
			.fail(function(e) {
				console.error('file: error setting file.synced = true', e);
				if(options.error) options.error(e);
			});

	},

	sync_to_api: function()
	{
		// grab the files collection, used to track downloads
		var files	=	turtl.files;
		turtl.db.files
			.query('has_data')
			.only(0)
			.execute()
			.done(function(res) {
				res.each(function(filedata) {
					console.log('about to download: ', filedata);
					if(res.deleted) return false;
					var model	=	this.create_remote_model(filedata);
					files.download(model);
				}.bind(this));
			}.bind(this))
			.fail(function(e) {
				console.error('sync: '+ this.local_table +': download: ', e);
			});
		return this.parent.apply(this, arguments);
	},

	sync_from_api: function(table, syncdata)
	{
		syncdata.each(function(item) {
			if(turtl.sync.should_ignore(item._sync.id, {type: 'remote'})) return false;

			if(_sync_debug_list.contains(this.local_table))
			{
				console.log('sync: '+ this.local_table +': api -> db ('+ item._sync.action +')');
			}

			var filedata	=	{
				id: item.file.hash,
				note_id: item.id,
				has_data: 0
			};
			if(item.deleted) filedata.deleted = 1;

			item.last_mod	=	new Date().getTime();

			table.update(filedata);
		});
	},

	track_file: function(type, track_id, trigger_fn, options)
	{
		options || (options = {});

		// download in progress? GTFO
		if(this[type][track_id]) return false;

		// track it
		this[type][track_id]	=	true;

		// hijack our completion functions so we can track the download
		var success			=	options.success;
		var progress		=	options.progress;
		var uploadprogress	=	options.progress;
		var error			=	options.error;

		this.trigger(type+'-start', track_id);

		options.success	=	function()
		{
			delete this[type][track_id];
			if(success) success.apply(this, arguments);
			this.trigger(type+'-success', track_id);
		}.bind(this);
		options.progress	=	function(ev)
		{
			if(progress) progress.apply(this, arguments);
			this.trigger(type+'-progress', track_id, ev);
		}.bind(this);
		options.uploadprogress	=	function(ev)
		{
			if(uploadprogress) uploadprogress.apply(this, arguments);
			this.trigger(type+'-progress', track_id, ev);
		}.bind(this);
		options.error	=	function(e, xhr)
		{
			delete this[type][track_id];
			if(error) error.apply(this, arguments);
			this.trigger(type+'-error', track_id);
			console.error('files: '+type+': error', xhr);
		}.bind(this);

		// run the actual download
		return trigger_fn(options);
	},

	download: function(model, options)
	{
		options || (options = {});
		return this.track_file('downloads', model.id(), model.download.bind(model), options);
	},

	upload: function(model, save_fn, options)
	{
		options || (options = {});
		return this.track_file('uploads', model.id(), save_fn.bind(model), options);
	}
});

