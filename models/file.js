var FileData = ProtectedThreaded.extend({
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

	do_save: function()
	{
		// track the file locally
		turtl.files.upsert(this);

		// encrypt the file (in a thread), then add to local DB
		this.toJSONAsync(function(data) {
			data.synced	=	false;
			turtl.db.files.add(data).then(
				function(yay) {
					// hash the body
					this.hash(data.body, {
						complete: function(hash) {
							// done, now upload!
							this.set({hash: hash});
							this.upload(data.body);
						}.bind(this)
					});
				}.bind(this),
				function(err) {
					console.log('file: do_save: error!!: ', err);
					barfr.barf('Error saving file: '+ err);
				}.bind(this)
			);
		}.bind(this));
	},

	upload: function(enc_data, options)
	{
		options || (options = {});

		var params	=	'file_id='+this.id()+'&hash='+this.get('hash');
		turtl.api.post('/files?'+params, enc_data, {
			success: function(res) {
				turtl.db.files.query().only(this.id()).execute().done(function(res) {
					var file	=	res[0];
					file.synced	=	true;
					turtl.db.files.update(file);
				}.bind(this));
			}.bind(this),
			error: function(err) {
				barfr.barf('Error uploading file: '+ err);
			}.bind(this)
		});
	}
});

var Files = Composer.Collection.extend({
	model: 'FileData',

	init: function()
	{
	}
});
