var BoardsItemController = Composer.Controller.extend({
	tag: 'li',

	elements: {
		'.board-actions': 'actions',
		'.children': 'children'
	},

	events: {
		'click': 'open_board',
		'click .menu a[rel=edit]': 'open_edit',
		'click .menu a[rel=delete]': 'delete',
		'click .menu a[rel=create-child-board]': 'open_create_child'
	},

	model: null,

	init: function()
	{
		this.render();
		this.with_bind(this.model, 'change', this.render.bind(this));
		this.with_bind(this.model.get('boards'), ['add', 'remove', 'reset'], this.render.bind(this));
	},

	render: function()
	{
		this.html(view.render('boards/item', {
			board: this.model.toJSON()
		}));
		var actions = [
			[{name: 'Edit'}, {name: 'Delete'}],
		];
		if(!this.model.get('parent_id'))
		{
			actions.push([{name: 'Create child board'}]);
		}
		this.track_subcontroller('actions', function() {
			return new ItemActionsController({
				inject: this.actions,
				title: 'Board menu',
				actions: actions
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

	open_board: function(e)
	{
		if(e && Composer.find_parent('.board-actions', e.target))
		{
			console.log('nevermd');
			return;
		}
		if(e) e.stop();
		turtl.route('/boards/'+this.model.id()+'/notes');
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

