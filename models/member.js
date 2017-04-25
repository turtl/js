var Member = Composer.Model.extend({
	sync: RemoteSync,
	url: function() {
		var base = '/spaces/'+this.get('space_id')+'/members';
		if(!this.is_new()) base += '/'+this.id();
		return base;
	},

	// used by the member controller
	get_email: function() {
		var email = this.get('username');
		return email && email.toLowerCase();
	}
});

var Members = SyncCollection.extend({
	model: Member
});

