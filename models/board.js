var Board = Protected.extend({
	base_url: '/boards',

	relations: {
		tags: {
			type: Composer.HasMany,
			collection: 'Tags'
		},
		notes: {
			type: Composer.HasMany,
			filter_collection: 'NotesFilter',
			master: function() { return turtl.profile.get('notes'); },
			options: {
				filter: function(model, notesfilter) {
					return model.get('board_id') == notesfilter.get_parent().id();
				},
				forward_all_events: true,
				refresh_on_change: false
			}
		},
		personas: {
			type: Composer.HasMany,
			collection: 'Personas'
		}
	},

	public_fields: [
		'id',
		'user_id',
		'keys',
		'privs',
		'personas',
		'meta',
		'shared'
	],

	private_fields: [
		'title'
	]
});

var Boards = SyncCollection.extend({
	model: Board
});

