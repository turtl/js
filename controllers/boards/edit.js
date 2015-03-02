var BoardsEditController = Composer.Controller.extend({
	elements: {
	},

	events: {
	},

	model: null,

	init: function()
	{
		if(!this.model) this.model = new Board();
		this.action = this.model.is_new() ? 'Add': 'Edit';
		this.render();

		modal.open(this.el);
		this.with_bind(modal, 'close', this.release.bind(this));

		turtl.push_title(this.action + ' board', '/');
		this.bind('release', turtl.pop_title.bind(turtl, false));
	},

	render: function()
	{
		this.html(view.render('boards/edit', {
			action: this.action,
			board: this.model.toJSON()
		}));
	}
});

