var Board = Protected.extend({
	base_url: '/boards',

	relations: {
		boards: {
			filter_collection: 'BoardsFilter',
			master: function() { return turtl.profile.get('boards'); },
			options: {
				filter: function(model, boardfilter) {
					return model.get('parent_id') == boardfilter.get_parent().id();
				}
			}
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
			this.get('boards').each(function(board) {
				board.destroy();
			});
		});
	},

	find_key: function(keys, search, options)
	{
		options || (options = {});
		search || (search = {});
		search.b || (search.b = []);

		var parent_id = this.get('parent_id');
		var parent = turtl.profile.get('boards').find_by_id(parent_id);
		if(parent)
		{
			search.b.push({id: parent.id(), k: parent.key});
		}
		return this.parent(keys, search, options);
	}
});

var Boards = SyncCollection.extend({
	model: Board
});

var BoardsFilter = Composer.FilterCollection.extend({
	sortfn: function(a, b) { return a.get('title', '').localeCompare(b.get('title', '')); }
});

