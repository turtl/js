var BoardsController = Composer.Controller.extend({
	class_name: 'boards-index',

	elements: {
		'.boards': 'board_list'
	},

	init: function()
	{
		turtl.push_title('Boards');
		this.render();

		turtl.events.trigger('actions:update', [
			{title: 'Create a board', name: 'add'}
		]);
		this.with_bind(turtl.events, 'actions:fire', function(action) {
			switch(action)
			{
				case 'add':
					this.open_add();
					break;
			}
		}.bind(this));
	},

	render: function()
	{
		this.html(view.render('boards/index', {}));
		this.track_subcontroller('list', function() {
			return new BoardsListController({
				inject: this.board_list,
				collection: turtl.profile.get('boards')
			});
		}.bind(this));
	},

	open_add: function()
	{
		new BoardsEditController();
	}
});

