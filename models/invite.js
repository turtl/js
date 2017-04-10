var Invite = Protected.extend({
	public_fields: [
		'id',
		'space_id',
		'role',
		'has_passphrase',
	],

	private_fields: [
		'key'
	],

	get_email: function() {
		return this.get('to_user');
	}
});

var Invites = SyncCollection.extend({
	model: Invite,
});

