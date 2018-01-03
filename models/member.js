var Member = Composer.Model.extend({
	url: function() {
		var base = '/spaces/'+this.get('space_id')+'/members';
		if(!this.is_new()) base += '/'+this.get('user_id');
		return base;
	},

	// used by the member controller
	get_email: function() {
		var email = this.get('username');
		return email && email.toLowerCase();
	},

	save: function() {
		return turtl.core.send('profile:space:edit-member', this.toJSON());
	},

	leave: function() {
		return turtl.core.send('profile:space:leave', this.get('space_id'));
	},

	delete: function() {
		return turtl.core.send('profile:space:delete-member', this.get('space_id'), this.get('user_id'));
	},
});

var Members = SyncCollection.extend({
	model: Member,

	sortfn: function(a, b) {
		if(a.get('role') == Permissions.roles.owner) return -1;
		if(b.get('role') == Permissions.roles.owner) return 1;
		return (a.get_email() || '').localeCompare(b.get_email() || '');
	},

	find_user: function(user_id) {
		return this.find(function(m) {
			return m.get('user_id') == user_id;
		});
	}
});

