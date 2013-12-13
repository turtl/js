var FileData = ProtectedThreaded.extend({
	base_url: '/files',

	public_fields: [
		'id',
		'hash',
		'upload_id'
	],

	private_fields: [
		'name',
		'type',
		'data'
	],

	init: function()
	{
	},

	attach_to_note: function(note, options)
	{
		this.bind('change:id', function() {
			this.unbind('change:id', 'file:monitor-id-change');
			if(note.is_new())
			{
				note.bind('change:id', function() {
					note.unbind('change:id', 'file:monitor-id-change');
					note.set({file_id: this.id()});
					note.save();
				}.bind(this), 'note:monitor-id-change');
			}
			else
			{
				note.save();
			}
		}.bind(this), 'file:monitor-id-change');
		this.do_save(options);
	},

	do_save: function(options)
	{
		options || (options = {});

		// encrypt the file (toJSOMAsync() will cache the results so save() can
		// access them), add in the hash, then save
		this.toJSONAsync(function(data) {
			// we now have the payload hash (thanks, hmac)
			var hash	=	convert.binstring_to_hex(tcrypt.deserialize(data.body, {hmac_only: true}));
			this.set({hash: hash});

			// note we can modify data here and it will modify the cached object
			// stored in the model that toJSON() returns.
			data.hash	=	hash;
			data.synced	=	false;

			// you made me use me last tissue. me ain't got anova one now.
			this.save(options);
		}.bind(this));
	},

	save: function(options)
	{
		options || (options = {});

		if(options.api_save)
		{
			var data	=	this.toJSON();
			var body	=	data.body;
			delete data.id;
			delete data.body;

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

			if(this.is_new())
			{
				var method	=	'post';
				var url		=	'/files';
			}
			else
			{
				var method	=	'put';
				var url		=	'/files/'+this.id();
			}

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
	local_table: 'files',

	process_local_sync: function(file_data, file)
	{
		if(file_data.deleted)
		{
			if(file) file.destroy({skip_local_sync: true, skip_remote_sync: true});
		}
		else if(file)
		{
			file.set(file_data);
		}
		else
		{
			var file	=	new FileData(file_data);
			if(file_data.cid) file._cid	=	file_data.cid;
			this.upsert(file);
		}
	}
});
