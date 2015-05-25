var NotesEditBoardsListController = Composer.Controller.extend({
	model: null,

	init: function()
	{
		this.render();
		this.with_bind(this.model, 'change:boards', this.render.bind(this));
	},

	render: function()
	{
		var pboards = turtl.profile.get('boards');
		var have_boards = pboards.size() > 0;
		var boards = pboards.toJSON_named((have_boards && this.model.get('boards')) || []);
		this.html(view.render('notes/edit/boards/list', {
			have_boards: have_boards,
			boards: boards
		}));
	}
});

