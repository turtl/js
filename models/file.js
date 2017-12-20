var NoteFile = Composer.Model.extend({
	sync_type: 'file',

	defaults: {
		synced: 0
	},

	public_fields: [
		'id',
		'size',
		'has_data'
	],

	private_fields: [
		'name',
		'type',
		'meta'
	],

	creating_blob: false,

	clear: function()
	{
		this.revoke();
		return this.parent.apply(this, arguments);
	},

	toJSON: function()
	{
		var data = this.get('data');
		if(data)
		{
			this.unset('data', {silent: true});
			var json = this.parent.apply(this, arguments);
			var obj = {data: data};
			this.set(obj, {silent: true});
		}
		else
		{
			var json = this.parent.apply(this, arguments);
		}
		delete json.blob_url;
		return json;
	},

	find_key: function()
	{
		var note = this && this.get_parent && this.get_parent();
		if(note)
		{
			this.key = note.key;
			return this.key;
		}
		return this.parent.apply(this, arguments);
	},

	has_data: function()
	{
		if(!this.id()) return Promise.reject('file: has_data: bad id');
		return turtl.db.files.get(this.id()).bind(this)
			.then(function(filedata) {
				if(!filedata) return false;
				return turtl.db.notes.get(filedata.note_id).bind(this)
					.then(function(notedata) {
						if(!notedata) return false;
						var size = ((notedata.file || {}).size || 0);
						if(size == 0) return false;
						return size <= (filedata.body || '').length;
					});
			});
	},

	to_array: function(options)
	{
		options || (options = {});

		var id = this.id()
		if(!id)
		{
			return Promise.reject(new Error('file: to_array: bad_id'));
		}

		var file = new FileData();
		return turtl.db.files.get(id).bind(this)
			.then(function(filedata) {
				if(!filedata)
				{
					this.set({has_data: 0});
					throw new Error('file: to_array: file data not present');
				}
				file.key = this.key;
				file.set(filedata);
				return file.deserialize();
			})
			.then(function(res) {
				return file.get('data');
			});
	},

	to_blob: function(options)
	{
		options || (options = {});

		if(this.creating_blob && !options.force) return Promise.reject({in_progress: true});

		if(!options.force) this.creating_blob = true;
		return this.to_array().bind(this)
			.then(function(array) {
				var blob = new Blob([array.buffer], {type: this.get('type')});
				if(!options.force)
				{
					this.set({blob_url: URL.createObjectURL(blob)}, options);
				}
				return blob;
			})
			.finally(function() {
				if(!options.force) this.creating_blob = false;
			});
	},

	revoke: function()
	{
		var blob_url = this.get('blob_url');
		if(!blob_url) return this;
		URL.revokeObjectURL(blob_url);
		this.unset('blob_url');
		return this;
	}
});

var FileData = Composer.Model.extend({
	rawdata: true,
	sync_type: 'file',

	public_fields: [
		'id',
		'note_id',
	],

	private_fields: [
		'data'
	],

	toJSON: function()
	{
		var data = this.get('data');
		var body = this.get('body');
		if(data || body)
		{
			this.unset('data', {silent: true});
			this.unset(this.body_key, {silent: true});
			var json = this.parent.apply(this, arguments);
			var obj = {data: data};
			obj[this.body_key] = body;
			this.set(obj, {silent: true});
			return json;
		}
		else
		{
			return this.parent.apply(this, arguments);
		}
	},
});

