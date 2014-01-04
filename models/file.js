var NoteFile = Protected.extend({
	base_url: '/files',

	public_fields: [
		'hash',
		'size',
		'upload_id',
		'synced'
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
					this.set({synced: false});
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
		'has_data',
		'synced'
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
			return this.parent.apply(this, arguments);
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
		turtl.api.get('/notes/'+this.get('note_id')+'/file', {}, {
			responseType: 'arraybuffer',
			success: function(res) {
				var body	=	uint8array_to_string(res);

				this.set({data: body});

				var data	=	{
					id: this.id(),
					note_id: this.get('note_id'),
					body: body,
					synced: true,
					has_data: true
				};

				// called when all finished
				var done	=	function()
				{
					if(options.success) options.success(this);
				}.bind(this);

				if(!options.skip_save)
				{
					// save the file data into the db
					turtl.db.files.update(data)
						.done(function() {
							// now update the note so it knows it has file contents
							turtl.db.notes
								.query()
								.filter('id', this.get('note_id'))
								.modify({
									file: function(n) { n.file.synced = true; return n.file; },
									last_mod: new Date().getTime()
								})
								.execute()
								.done(done)
								.fail(function(e) {
									console.error('file: download: save error: ', e);
									if(options.error) options.error(e);
								});
						}.bind(this))
						.fail(function(e) {
							console.error('file: download: save error: ', e);
							if(options.error) options.error(e);
						});
				}
				else
				{
					done();
				}
			}.bind(this),
			error: options.error
		});
	}
});

var Files = SyncCollection.extend({
	model: FileData,
	local_table: 'files',

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
			.filter('id', hash)
			.modify({synced: true})
			.execute()
			.done(function() {
				turtl.db.notes
					.query()
					.filter('id', note_id)
					.modify({last_mod: new Date().getTime()})
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

	}
});
