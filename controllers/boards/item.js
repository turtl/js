var BoardsItemController = Composer.Controller.extend({
	tag: 'li',

	elements: {
		'.board-actions': 'actions',
		'.children': 'children'
	},

	events: {
		'click .menu a[rel=edit]': 'open_edit',
		'click .menu a[rel=delete]': 'delete',
		'click .menu a[rel=create-child-board]': 'open_create_child'
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
				title: 'Board menu',
				actions: [
					[{name: 'Edit'}, {name: 'Delete'}],
					[{name: 'Create child board'}]
				]
			});
		}.bind(this));
		this.track_subcontroller('children', function() {
			return new BoardsListController({
				inject: this.children,
				collection: this.model.get('boards'),
				child: true
			});
		}.bind(this))
	},

	open_edit: function(e)
	{
		if(e) e.stop();
		new BoardsEditController({
			model: this.model
		});
	},

	open_create_child: function(e)
	{
		if(e) e.stop();
		new BoardsEditController({
			model: new Board({parent_id: this.model.id()})
		});
	},

	delete: function(e)
	{
		if(e) e.stop();
		if(!confirm('Really delete the board "'+ this.model.get('title') +'" and all of its notes PERMANENTLY?? This cannot be undone!!')) return false;

		this.model.destroy()
			.catch(function(err) {
				log.error('board: delete: ', derr(err));
				barfr.barf('There was a problem deleting your board: '+ err.message);
			});
	}
});

