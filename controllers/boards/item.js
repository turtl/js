var BoardsItemController = Composer.Controller.extend({
	tag: 'li',

	elements: {
		'.board-actions': 'actions'
	},

	events: {
		'click .menu a[rel=edit]': 'open_edit',
		'click .menu a[rel=delete]': 'delete'
	},

	model: null,

	init: function()
	{
		this.render();
		this.with_bind(this.model, 'change', this.render.bind(this));
	},

	render: function()
	{
		this.html(view.render('boards/item', {
			board: this.model.toJSON()
		}));
		this.track_subcontroller('actions', function() {
			return new ItemActionsController({
				inject: this.actions,
				title: 'Board actions',
				actions: [['Edit', 'Delete']]
			});
		}.bind(this));
	},

	open_edit: function(e)
	{
		if(e) e.stop();
		new BoardsEditController({
			model: this.model
		});
	},

	delete: function(e)
	{
		if(e) e.stop();
		if(!confirm('Really delete this board, and all of its notes PERMANENTLY?? This cannot be undone!!')) return false;

		this.model.destroy()
			.catch(function(err) {
				log.error('board: delete: ', derr(err));
				barfr.barf('There was a problem deleting your board: '+ err.message);
			});
	}
});

