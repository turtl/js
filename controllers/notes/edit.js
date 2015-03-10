var NotesEditController = FormController.extend({
	elements: {
	},

	events: {
	},

	model: null,
	formclass: 'notes-edit',

	type: 'text',
	board_id: null,

	init: function()
	{
		if(!this.model) this.model = new Note({
			boards: (this.board_id ? [this.board_id] : []),
			type: this.type || 'text'
		});
		this.action = this.model.is_new() ? 'Add' : 'Edit';
		this.parent();
		this.render();

		var url = '/notes/' + this.action.toLowerCase() + '/' + (this.model.is_new() ? '' : this.model.id());
		var close = turtl.push_modal_url(url);
		modal.open(this.el);
		this.with_bind(modal, 'close', this.release.bind(this));

		turtl.push_title(this.action + ' note', turtl.last_url);
		this.bind('release', turtl.pop_title.bind(null, false));
		this.bind(['cancel', 'close'], close);
	},

	render: function()
	{
		this.html(view.render('notes/edit', {
			note: this.model.toJSON(),
			type: this.model.get('type') || this.type
		}));
	},

	submit: function(e)
	{
		if(e) e.stop();

		// TODO: set user_id into Note
		// TODO: set user_id into Board (in board edit)
	}
});

