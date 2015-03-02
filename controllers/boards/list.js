var BoardsListController = Composer.ListController.extend({
	elements: {
		'ul': 'board_list'
	},

	collection: null,

	init: function()
	{
		this.render();
		this.track(this.collection, function(model, options) {
			return new BoardsItemController({
				inject: this.board_list,
				model: model
			});
		}.bind(this));
	},

	render: function()
	{
		this.html(view.render('boards/list'));
	}
});

