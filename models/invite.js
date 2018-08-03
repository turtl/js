var Invite = SyncModel.extend({
	sync_type: 'invite',

	// used by the member controller
	get_email: function() {
		var email = this.get('to_user');
		return email && email.toLowerCase();
	},

	accept: function(passphrase) {
		return turtl.core.send('profile:accept-invite', this.toJSON(), passphrase);
	},

	delete: function() {
		return turtl.core.send('profile:delete-invite', this.id());
	}
});

var Invites = SyncCollection.extend({
	model: Invite,
	sync_type: 'invite',
});

