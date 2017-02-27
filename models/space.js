var Space = Protected.extend({
	base_url: '/spaces',

	public_fields: [
		'id',
		'user_id',
		'keys',
	],

	private_fields: [
		'title',
		'color',
	],

	update_keys: function(options)
	{
		options || (options = {});

		this.set({user_id: turtl.user.id()}, options);

		// is this needed? copied from Note model's update_keys() fn
		var key = this.ensure_key_exists();
		if(!key) return Promise.reject(new Error('space: missing key: '+ this.id()));

		var keychain = turtl.profile.get('keychain');
		var existing = keychain.find_key(this.id());
		if(!existing || (this.key && JSON.stringify(existing) != JSON.stringify(this.key)))
		{
			// key needs an add/update
			return keychain.upsert_key(this.id(), 'space', this.key);
		}
		return Promise.resolve();
	},

	save: function(options)
	{
		options || (options = {});

		var parentfn = this.$get_parent();
		return this.update_keys(options).bind(this)
			.then(function() {
				options.table = 'spaces';
				return parentfn.call(this, options);
			});
	},

	get_color: function()
	{
		var color = this.get('color');
		if(!color) {
			var available_colors = [
				'666666',
				'e85c5c',
				'65a5ee',
				'9476de',
				'76dec2',
				'672020',
				'd46ccf',
				'6b6ef3',
				'e4ba58',
				'aa0033',
			];
			var id = this.id();
			var num = 0;
			for(var i = 0, n = id.length; i < n; i++) {
				num += id.charCodeAt(i) * 2;
			}
			color = '#'+available_colors[num % available_colors.length];
		}

		var cr = parseInt(color.substr(1, 2), 16);
		var cg = parseInt(color.substr(3, 2), 16);
		var cb = parseInt(color.substr(5, 2), 16);
		var avg = (cr + cg + cb) / 3;
		var txt_shade = avg < 128 ? 'light' : 'dark';
		return {bg: color, txt: txt_shade};
	}
});

var Spaces = SyncCollection.extend({
	model: Space,
	local_table: 'spaces',
});

