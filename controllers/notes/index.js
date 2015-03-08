var NotesIndexController = Composer.Controller.extend({
	elements: {
		'> .notes': 'note_list'
	},

	board: null,
	board_id: null,

	init: function()
	{
		this.board = turtl.profile.get('boards').find_by_id(this.board_id);

		if(!this.board)
		{
			this.release();
			throw new Error('boards: view: missing board ('+this.board_id+')');
		}

		turtl.push_title(this.board.get('title'));
		this.bind('release', turtl.pop_title);

		turtl.events.trigger('actions:update', [
			{title: 'Create a board', name: 'add'}
		]);
		this.with_bind(turtl.events, 'actions:fire', function(action) {
			switch(action)
			{
				case 'add': this.open_add(); break;
			}
		}.bind(this));
	},

	render: function()
	{
		this.html(view.render('notes/index', {}));
		this.track_subcontroller('list', function() {
			return new NotesListController({
				inject: this.note_list,
				search: {
					board_id: this.board.id()
				},
				collection: turtl.profile.get('notes')
			});
		}.bind(this));
	},

	open_add: function()
	{
		new NotesEditController();
	}
});

