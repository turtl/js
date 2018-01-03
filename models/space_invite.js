var SpaceInvite = Composer.Model.extend({
	// used by the member controller
	get_email: function() {
		var email = this.get('to_user');
		return email && email.toLowerCase();
	},

	send: function(pubkey, passphrase) {
		var req = this.toJSON();
		req.their_pubkey = pubkey;
		req.passphrase = passphrase;
		return turtl.core.send('profile:space:send-invite', req);
	},

	save: function() {
		return turtl.core.send('profile:space:edit-invite', this.toJSON());
	},

	delete: function() {
		return turtl.core.send('profile:space:delete-invite', this.get('space_id'), this.id());
	}
});

var SpaceInvites = Composer.Collection.extend({
	model: SpaceInvite,
});


