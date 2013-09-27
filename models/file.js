var FileData = ProtectedThreaded.extend({
	public_fields: [
		'id'
	],

	private_fields: [
		'name',
		'hash',
		'type',
		'data'
	],

	init: function()
	{
	},

	upload: function(options)
	{
		options || (options = {});

		this.toJSONAsync(function(data) {
			turtl.api.post('/files', {}, {
				success: function(res) {
				},
				error: options.error
			});
		});
	}
});

var Files = Composer.Collection.extend({
	model: 'FileData'
});
