var Board = SyncModel.extend({
	sync_type: 'board',

	public_fields: [
		'id',
		'space_id',
		'user_id',
		'keys',
	],

	private_fields: [
		'title'
	],

	note_count: function()
	{
		return turtl.search.search({board: this.id()}).bind(this)
			.spread(function(notes) {
				var unique_notes  = notes.filter(function(note, i) { return i == notes.lastIndexOf(note); });
				return unique_notes.length;
			});
	},

	get_space: function()
	{
		var space_id = this.get('space_id');
		if(!space_id) return false;
		return turtl.profile.get('spaces').get(space_id) || false;
	},

	move_spaces: function(new_space_id) {
		this.set({space_id: new_space_id});
		return this.save({custom_method: 'move-space'});
	},
});

var Boards = SyncCollection.extend({
	model: Board,
	sync_type: 'board',

	toJSON_named: function(board_ids)
	{
		return board_ids
			.map(function(bid) {
				var board = this.find_by_id(bid);
				if(!board) return false;
				var name = board.get('title') || i18next.t('(untitled board)');
				var json = board.toJSON();
				json.name = name;
				if(!json.title) json.title = i18next.t('(untitled board)');
				return json;
			}.bind(this))
			.filter(function(board) { return !!board; });
	}
});

var BoardsFilter = Composer.FilterCollection.extend({
	sortfn: function(a, b) { return a.get('title', '').localeCompare(b.get('title', '')); }
});

