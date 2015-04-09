var NotesEditBoardsController = FormController.extend({
	elements: {
	},

	events: {
		'click ul.item-list > li': 'toggle_board'
	},

	modal: null,

	model: null,
	clone: null,
	formclass: 'notes-edit-boards',
	button_tabindex: 3,
	action: 'Done',

	collection: null,

	init: function()
	{
		this.clone = this.model.clone();
		this.collection = new Boards();

		this.modal = new TurtlModal({
			show_header: true,
			title: 'Select note boards'
		});
		this.modal.el.addClass('note-edit-boards');

		this.parent();
		this.render();

		var close = this.modal.close.bind(this.modal);
		this.modal.open(this.el);
		this.with_bind(this.modal, 'close', this.release.bind(this));
		this.bind(['cancel', 'close'], close);

		this.with_bind(this.clone, 'change:boards', this.render.bind(this));
	},

	render: function()
	{
		var note_boards = this.clone.get('boards');
		var select = function(board)
		{
			if(note_boards.contains(board.id)) board.selected = true;
			if(board.children) board.children.forEach(select);
		};
		var boards = turtl.profile.get('boards').toJSON_hierarchical();
		boards.forEach(select);

		this.html(view.render('notes/edit/boards/index', {
			boards: boards
		}));
	},

	submit: function(e)
	{
		if(e) e.stop();

		this.model.set({boards: this.clone.get('boards').slice(0)});
		this.trigger('close');
	},

	toggle_board: function(e)
	{
		if(e) e.stop();
		var li = Composer.find_parent('ul.item-list > li', e.target);
		if(!li) return;
		var board_id = li.get('rel');

		var boards = (this.clone.get('boards') || []).slice(0);
		var is_selected = boards.contains(board_id);
		if(is_selected)
		{
			boards.erase(board_id);
		}
		else
		{
			boards.push(board_id);
		}
		this.clone.set({boards: boards});
	}
});

