var BoardsViewController = Composer.Controller.extend({
	inject: turtl.main_container_selector,

	elements: {
		'.notes': 'notes'
	},

	board_id: null,
	board: null,

	init: function()
	{
		var board = null;
		if(this.board_id)
		{
			board = turtl.profile.get('boards').find_by_id(this.board_id);
		}
		if(!board) board = turtl.profile.get_current_board();
		if(!board)
		{
			barfr.barf('Board not found.');
			return this.release();
		}
		this.board = board;

		turtl.push_title(board.get('title'), '/');

		this.render();

		turtl.controllers.pages.trigger('loaded');

		this.with_bind(turtl.profile.get('boards'), 'remove', function(board) {
			if(this.board == board) this.release(true);
		}.bind(this));

		this.with_bind(turtl.keyboard, 'S-/', this.open_help.bind(this));
	},

	release: function(back_to_boards)
	{
		turtl.pop_title(back_to_boards === true);
		return this.parent.apply(this, arguments);
	},

	render: function()
	{
		var content = view.render('boards/view');
		this.html(content);

		this.track_subcontroller('notes', function() {
			return new NotesController({
				inject: this.notes,
				board: this.board
			});
		}.bind(this));
	},

	open_help: function()
	{
		new HelpController();
	}
});

