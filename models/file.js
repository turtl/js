var NoteFile = SyncModel.extend({
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

	init: function() {
		this.bind('destroy', function() {
			this.revoke();
		}.bind(this));
	},

	clear: function()
	{
		this.revoke();
		return this.parent.apply(this, arguments);
	},

	has_data: function()
	{
		if(!this.id()) return Promise.reject('file: has_data: bad id');
		return FileData.prototype.load_contents(this.id())
			.then(function() { return true; })
			.catch(function(_) { return false; });
	},

	to_array: function(options)
	{
		options || (options = {});

		var id = this.id()
		if(!id) {
			return Promise.reject(new Error('file: to_array: bad_id'));
		}

		return FileData.prototype.load_contents(id);
	},

	to_blob: function(options)
	{
		options || (options = {});

		if(this.creating_blob && !options.force) return Promise.reject({in_progress: true});

		if(!options.force) this.creating_blob = true;
		return this.to_array().bind(this)
			.then(function(array) {
				var blob = new Blob([array.buffer], {type: this.get('type')});
				if(!options.force) {
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
	},

	incoming_sync: function(sync_item) {
		if(sync_item.type != 'file') return;
		// guaranteed by some sierra club asshole not to leak a blob URL...
		// IF you step on it.
		this.revoke();
		return this.parent(sync_item);
	},
});

var FileData = Composer.Model.extend({
	rawdata: true,

	public_fields: [
		'id',
		'note_id',
	],

	private_fields: [
		'data'
	],

	load_contents: function(note_id) {
		return turtl.core.send('profile:note:get-file', note_id)
			.then(function(base64) {
				return new Uint8Array(base64_to_buffer(base64));
			});
	},
});

