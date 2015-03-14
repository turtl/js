var NotesItemController = Composer.Controller.extend({
	tag: 'li',
	class_name: 'note',

	model: null,

	init: function()
	{
		this.render();
		this.with_bind(this.model, 'change', function() {
			this.render();
			this.trigger('update');
		}.bind(this))
	},

	render: function()
	{
		var type_content = view.render('notes/types/'+this.model.get('type'), {
			note: this.model.toJSON(),
			empty: empty
		});
		this.html(view.render('notes/item', {
			content: type_content,
			note: this.model.toJSON()
		}));
		this.el.addClass(this.model.get('type'));
		this.el.set('rel', this.model.id());
	}
});

