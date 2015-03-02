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
	},

	delete: function(e)
	{
		if(e) e.stop();
		if(!confirm('Really delete this board, and all of its notes PERMANENTLY?? This cannot be undone!!')) return false;

		this.model.destroy()
			.then(function() {
				barfr.barf('Board deleted!');
			})
			.catch(function(err) {
				log.error('board: delete: ', err.stack);
				barfr.barf('There was a problem deleting your board: '+ err.message);
			});
	}
});

