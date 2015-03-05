var BoardsListController = Composer.ListController.extend({
	elements: {
		'ul': 'board_list'
	},

	collection: null,
	child: false,

	init: function()
	{
		if(this.child && this.collection.size() == 0) return this.release();

		this.bind('list:empty', this.render.bind(this, {empty: true}));
		this.bind('list:notempty', this.render.bind(this));

		this.track(this.collection, function(model, options) {
			return new BoardsItemController({
				inject: this.board_list,
				model: model
			});
		}.bind(this));
	},

	render: function(options)
	{
		options || (options = {});
		this.html(view.render('boards/list', {
			empty: options.empty,
			child: this.child
		}));
	}
});

