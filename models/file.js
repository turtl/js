var FileData = ProtectedThreaded.extend({
	base_url: '/files',

	public_fields: [
		'id',
		'hash'
	],

	private_fields: [
		'name',
		'type',
		'data'
	],

	init: function()
	{
	},

	attach_to_note: function(note)
	{
		var have_id	=	false;
	},

	do_save: function(options)
	{
		options || (options = {});

		// track the file locally
		turtl.profile.get('files').upsert(this);

		// encrypt the file (toJSOMAsync() will cache the results so save() can
		// access them), add in the hash, then save
		this.toJSONAsync(function(data) {
			// we now have the payload hash (thanks, hmac)
			var hash	=	tcrypt.deserialize(data.body, {hmac_only: true});
			this.set({hash: hash});

			// note we can modify data here and it will modify the cached object
			// stored in the model that toJSON() returns.
			data.hash	=	hash;
			data.synced	=	false;

			// you made me use me last tissue. me ain't got anova one now.
			this.save(options);
		});
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

			var success	=	options.success;
			options.success	=	function(res)
			{
				turtl.db.files.query().only(this.id()).execute().done(function(res) {
					var file	=	res[0];
					file.synced	=	true;
					turtl.db.files.update(file);
				}.bind(this));
				if(success) success.apply(this, arguments);
			};

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
			var method	=	this.is_new() ? 'post' : 'put';

			// here we send everything but the encrypted body as GET parameters,
			// then pass the raw body string as a POST. this allows chunking it
			// straight to the storage platform
			turtl.api[method](url+'?'+Object.toQueryString(data), body, {
				success: api_sync.success_fn(options),
				error: api_sync.error_fn(options)
			});
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
