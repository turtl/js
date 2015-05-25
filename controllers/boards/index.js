var BoardsController = Composer.Controller.extend({
	class_name: 'boards-index',

	elements: {
		'.boards': 'board_list'
	},

	collection: null,

	init: function()
	{
		turtl.push_title('Boards');
		this.bind('release', turtl.pop_title.bind(null, false));

		this.collection = new BoardsFilter(turtl.profile.get('boards'), {
			filter: function(b) { return !b.get('parent_id'); }
		});

		this.render();

		// set up the action button
		this.track_subcontroller('actions', function() {
			var actions = new ActionController();
			actions.set_actions([{title: 'Create a board', name: 'add'}]);
			this.with_bind(actions, 'actions:fire', function(action) {
				switch(action)
				{
					case 'add': this.open_add(); break;
				}
			}.bind(this));
			return actions;
		}.bind(this));
	},

	render: function()
	{
		this.html(view.render('boards/index', {}));
		this.track_subcontroller('list', function() {
			return new BoardsListController({
				inject: this.board_list,
				collection: this.collection
			});
		}.bind(this));
	},

	open_add: function()
	{
		new BoardsEditController();
	}
});

