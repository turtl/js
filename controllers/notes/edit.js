var NotesEditController = FormController.extend({
	elements: {
	},

	events: {
	},

	model: null,
	formclass: 'notes-edit',

	init: function()
	{
		if(!this.model) this.model = new Note();
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
		}));
	}
});

