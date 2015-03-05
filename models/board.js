var Board = Protected.extend({
	base_url: '/boards',

	relations: {
		boards: {
			collection: 'Boards'
		},
		personas: {
			collection: 'Personas'
		}
	},

	public_fields: [
		'id',
		'user_id',
		'parent_id',
		'keys',
		'privs',
		'personas',
		'meta',
		'shared'
	],

	private_fields: [
		'title'
	],

	init: function()
	{
		this.bind('destroy', function() {
			turtl.profile.get('keychain').remove_key(this.id());
		});
	}
});

var Boards = SyncCollection.extend({
	model: Board
});

