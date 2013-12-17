var NoteFile = Protected.extend({
	base_url: '/files',

	public_fields: [
		'hash',
		'size',
		'upload_id'
	],

	private_fields: [
		'name',
		'type'
	],

	ensure_key_exists: function()
	{
		var note	=	this && this.get_parent && this.get_parent();
		if(note) return note.key;
		return this.parent.apply(this, arguments);
	}
});

var FileData = ProtectedThreaded.extend({
	base_url: '/files',

	public_fields: [
		'id',
		'note_id'
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

			var success		=	options.success;
			options.success	=	function(res)
			{
				if(success) success(this, res, function() {
					turtl.db.files.query().only(this.id()).execute().done(function(res) {
						var file	=	res[0];
						file.synced	=	true;
						turtl.db.files.update(file);
					}.bind(this));
				}.bind(this));
			}.bind(this);

			// convert body to Uint8Array
			// TODO: always store file body as Uint8Array in local db...
			var raw	=	new Uint8Array(body.length);
			for(var i = 0, n = body.length; i < n; i++)
			{
				raw[i]	=	body.charCodeAt(i);
			}

			// mark the save as raw and fire it off
			options.raw		=	true;
			options.data	=	raw;
			options.args	=	data;
			this.url		=	'/notes/'+this.get('note_id')+'/file';
			return this.parent.apply(this, arguments);
		}
		else
		{
			return this.parent.apply(this, arguments);
		}
	}
});

var Files = SyncCollection.extend({
	model: FileData,
	local_table: 'files'
});
