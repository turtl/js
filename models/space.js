var Space = Composer.RelationalModel.extend({
	relations: {
		members: { collection: 'Members' },
		invites: { collection: 'Invites' },
	},

	sync_type: 'space',

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
		this.parent.apply(this, arguments);
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

	get_owner: function()
	{
		return this.get('members')
			.filter(function(m) { return m.get('role') == Permissions.roles.owner; })[0];
	},

	set_owner: function(member_id)
	{
		return turtl.api.put('/spaces/'+this.id()+'/owner/'+member_id)
			.bind(this)
			.then(function(space) {
				delete space.sync_ids;
				this.set(space);
			});
	},

	is_shared_with_me: function()
	{
		return !this.is_new() && this.get('user_id') != turtl.user.id();
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
	sync_type: 'space',
	sortfn: function(a, b) {
		var default_space = turtl.user.setting('default_space');
		var is_default_a = a.id() == default_space;
		var is_default_b = b.id() == default_space;
		if(is_default_a) return -1;
		if(is_default_b) return 1;
		return (a.get('title') || '').toLowerCase().localeCompare((b.get('title') || '').toLowerCase());
	},
});

