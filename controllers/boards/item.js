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
		'click .menu a[rel=create-nested-board]': 'open_create_child',
		'click .menu a[rel=leave-this-board]': 'leave_board'
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
				var board_id = this.model.id();
				var parent_id = this.model.get('parent_id');
				var my_persona = turtl.profile.get('personas').first().id();
				var has_invites = turtl.profile.get('invites').filter(function(inv) {
					var obj = inv.get('object_id')
					return (obj == board_id) && inv.get('from') == my_persona;
				}.bind(this)).length > 0;
				var has_shares = Object.keys(this.model.get('privs') || {}).length > 0;
				var shared_with_me = !!this.model.get('shared');
				var shared_by_me = !shared_with_me && (has_invites || has_shares);
				var shared_with_me_directly = shared_with_me &&
					!!(this.model.get('privs') || {})[my_persona];
				this.html(view.render('boards/item', {
					board: this.model.toJSON(),
					num_notes: num_notes,
					shared: shared_with_me_directly || shared_by_me,
					shared_by_me: shared_by_me,
					shared_with_me: shared_with_me,
					shared_with_me_directly: shared_with_me_directly
				}));

				if(shared_with_me) this.el.addClass('shared-with-me');

				var actions = [];
				if(shared_with_me)
				{
					if(shared_with_me_directly)
					{

						actions.push([{name: 'Leave this board'}]);
					}
				}
				else
				{
					actions.push([{name: 'Edit'}, {name: 'Delete'}]);
					actions.push([{name: 'Share this board', href: '/boards/share/'+this.model.id()}]);
					if(!parent_id) actions.push([{name: 'Create nested board'}]);
				}
				if(actions.length)
				{
					this.track_subcontroller('actions', function() {
						return new ItemActionsController({
							inject: this.actions,
							actions: actions
						});
					}.bind(this));
				}
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
		if(e && (Composer.find_parent('.board-actions', e.target) || Composer.find_parent('.status a', e.target)))
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
	},

	leave_board: function(e)
	{
		if(e) e.stop();
		var persona = turtl.profile.get('personas').first();
		if(!persona)
		{
			barfr.barf('A strange error occurred. Please log out and try again.');
			return;
		}
		if(!confirm('Really leave this board?')) return;
		var title = this.model.get('title');
		this.model.remove_persona(persona)
			.then(function() {
				barfr.barf('You left the board "'+ title +'"');
			})
			.catch(function(err) {
				turtl.events.trigger('ui-error', 'There was a problem leaving that board', err);
				log.error('board: leave: ', derr(err));
			});
	}
});

