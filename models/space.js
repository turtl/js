var Space = Protected.extend({
	base_url: '/spaces',

	relations: {
		members: { collection: 'Members' },
		invites: { collection: 'Invites' },
	},

	public_fields: [
		'id',
		'user_id',
		// NOTE: members/invites aren't in this list, but they are effectively
		// part of the public fields. see safe_json override below.
		'keys',
	],

	private_fields: [
		'title',
		'color',
	],

	initialize: function()
	{
		this.parent.apply(this, arguments);

		// make sure we remove any space-specific settings when a space is
		// destroyed
		this.bind('destroy', function() {
			if(!turtl.user) return;
			turtl.user.delete_setting('spaces:'+this.id()+':*');
		}.bind(this));
		// make sure the current space gets updated properly when destroyed
		this.bind('destroy', function() {
			if(!turtl.profile) return;
			if(turtl.profile.current_space().id() != this.id()) return;
			// note, this would fire BEFORE the space is removed from the spaces
			// collection, so we need to wait for the event chain to propagate
			// (and the space to be removed) before selcting the next space
			setTimeout(function() {
				turtl.profile.set_current_space(null);
			});
		}.bind(this));
	},

	init: function()
	{
		this.bind('destroy', function(_1, _2, options) {
			options || (options = {});
			var options_nosync = clone(options);
			options_nosync.skip_remote_sync = true;
			return this.each_note(function(note) { return note.destroy(options_nosync); })
				.bind(this)
				.then(function() {
					return this.each_board(function(board) { return board.destroy(options_nosync); });
				})
				.then(function() {
					return turtl.profile.get('keychain').remove_key(this.id(), options);
				});
		}.bind(this));
		this.bind('destroy', turtl.search.unindex_space.bind(turtl.search, this, {full: true}));
		this.bind('change', function() {
			if(!this.id(true)) return;
			turtl.search.reindex_space(this);
		}.bind(this));
	},

	/**
	 * override to essentially make members/invites "public" fields so they get
	 * saved to the local DB on save. technically, we shouldn't be sending these
	 * fields across to the API, but realistically it completely discards them
	 * so we're safe.
	 *
	 * the reason we don't make the "real" public fields is because the
	 * Protected model throws a little tantrum when trying to (de)serialize
	 * collections in relation objects (creates double entries, deletes some
	 * entries, etc). don't have time to dig right now, so hacking this.
	 */
	safe_json: function()
	{
		var data = this.parent.apply(this, arguments);
		data.members = this.get('members').safe_json();
		data.invites = this.get('invites').safe_json();
		return data;
	},

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
		return this.update_keys(options)
			.bind(this)
			.then(function() {
				options.table = 'spaces';
				return parentfn.call(this, options);
			});
	},

	can_i: function(permission, options)
	{
		var user_id = turtl.user.id();
		// grab the curren user's member record
		var member = this.get('members')
			.select_one({user_id: user_id});
		// if no record, get out
		if(!member) return false;
		var role = member.get('role');
		// check the permissions!
		return Permissions.role_permissions[role].indexOf(permission) >= 0;
	},

	is_shared: function()
	{
		return !this.is_new() && this.get('user_id') != turtl.user.id();
	},

	each_type: function(type, cls, callback, options)
	{
		options || (options = {});
		var memcollection = turtl.profile.get(type);
		return turtl.db[type].query('space_id').only(this.id()).execute()
			.then(function(items) {
				var promises = (items || []).map(function(item) {
					var existing = true;
					// if we have an existing item in-memory, use it.
					// this will also apply our changes in any listening
					// collections
					var model = memcollection.get(item.id)
					if(!model)
					{
						// if we don't have an existing in-mem model,
						// create one and then apply our changes to it
						model = new cls(item);
						existing = false;
						if(options.decrypt)
						{
							return model.deserialize()
								.then(function() {
									return callback(model, {existing: true});
								})
								.catch(function(err) {
									log.error('space.each_type(): deserialize: ', err, item);
									throw err;
								});
						}
					}
					return callback(model, {existing: existing});
				});
				return Promise.all(promises);
			});
	},

	each_board: function(callback, options)
	{
		return this.each_type('boards', Board, callback, options);
	},

	each_note: function(callback, options)
	{
		return this.each_type('notes', Note, callback, options);
	},

	get_color: function()
	{
		var color = this.get('color');
		if(!color) {
			var available_colors = [
				'666666',
				'b57316',
				'8059ad',
				'76dec2',
				'c32727',
				'de88de',
				'8ea8e0',
				'e4ba58',
				'bb1664',
				'bbbb44',
				'1f9016',
			];
			var id = this.id();
			var hash = tcrypt.sha512(id);
			var num = hash.reduce(function(acc, x) { return acc + x; }, 0);
			color = '#'+available_colors[num % available_colors.length];
		}

		var cr = parseInt(color.substr(1, 2), 16);
		var cg = parseInt(color.substr(3, 2), 16);
		var cb = parseInt(color.substr(5, 2), 16);
		var avg = (cr + cg + cb) / 3;
		var txt_shade = avg < 140 ? 'light' : 'dark';
		return {bg: color, txt: txt_shade};
	},

	setting: function(key, val)
	{
		return turtl.user.setting('spaces:'+this.id()+':'+key, val);
	}
});

var Spaces = SyncCollection.extend({
	model: Space,
	local_table: 'spaces',
	sortfn: function(a, b) { return a.id().localeCompare(b.id()); },
});

