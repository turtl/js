var NotesEditBoardsController = Composer.Controller.extend({
	events: {
	},

	model: null,

	init: function()
	{
		if(!this.model) return this.release();

		this.render();
	},

	render: function()
	{
		var boards = turtl.profile.get('boards').toJSON();
		this.html(view.render('notes/edit/boards', {
			boards: boards
		}));
	}
});

