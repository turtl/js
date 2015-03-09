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

		turtl.events.trigger('actions:update', [
			{title: 'Create a board', name: 'add'}
		]);
		this.with_bind(turtl.events, 'actions:fire', function(action) {
			switch(action)
			{
				case 'add': this.open_add(); break;
			}
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

