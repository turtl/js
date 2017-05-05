var Member = Composer.Model.extend({
	sync: RemoteSync,
	url: function() {
		var base = '/spaces/'+this.get('space_id')+'/members';
		if(!this.is_new()) base += '/'+this.get('user_id');
		return base;
	},

	// used by the member controller
	get_email: function() {
		var email = this.get('username');
		return email && email.toLowerCase();
	}
});

var Members = SyncCollection.extend({
	model: Member,

	sortfn: function(a, b) {
		if(a.get('role') == Permissions.roles.owner) return -1;
		if(b.get('role') == Permissions.roles.owner) return 1;
		return (a.get_email() || '').localeCompare(b.get_email() || '');
	}
});

