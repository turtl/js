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
		var boards = ((have_boards && this.model.get('boards')) || []).map(function(bid) {
			var board = pboards.find_by_id(bid);
			if(!board) return false;
			var name = board.get('title');
			var parent_id = board.get('parent_id');
			if(parent_id)
			{
				var parent = pboards.find_by_id(parent_id);
				if(parent) name = parent.get('title') + '/' + name;
			}
			var json = board.toJSON();
			json.name = name;
			return json;
		}).filter(function(board) { return !!board; });

		this.html(view.render('notes/edit/boards/list', {
			have_boards: have_boards,
			boards: boards
		}));
	}
});

