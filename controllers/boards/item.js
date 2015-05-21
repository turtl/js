var BoardsItemController = Composer.Controller.extend({
	tag: 'li',

	elements: {
		'.board-actions': 'actions',
		'.children': 'children'
	},

	events: {
		'click': 'open_board',
		'click .menu a[rel=edit]': 'open_edit',
		'click .menu a[rel=delete]': 'open_delete',
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
		this.model.note_count().bind(this)
			.then(function(num_notes) {
				this.html(view.render('boards/item', {
					board: this.model.toJSON(),
					num_notes: num_notes
				}));
				var actions = [
					[{name: 'Edit'}, {name: 'Delete'}],
				];
				if(!this.model.get('parent_id'))
				{
					actions.push([{name: 'Create child board'}]);
				}
				actions.push([{name: 'Share this board', href: '/boards/share/'+this.model.id()}]);
				this.track_subcontroller('actions', function() {
					return new ItemActionsController({
						inject: this.actions,
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
			});
	},

	open_board: function(e)
	{
		if(e && Composer.find_parent('.board-actions', e.target))
		{
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

	open_delete: function(e)
	{
		if(e) e.stop();
		new BoardsDeleteController({
			model: this.model
		});
	}
});

