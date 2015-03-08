var NotesItemController = Composer.Controller.extend({
	model: null,

	init: function()
	{
		this.render();
		this.with_bind(this.model, 'change', this.render.bind(this));
	},

	render: function()
	{
		this.html(view.render('notes/item', {
			note: this.model.toJSON()
		}));
	}
});

