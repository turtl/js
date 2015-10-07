var SharingBoardsListController = Composer.ListController.extend({
	elements: {
		'.item-list': 'el_list'
	},

	empty_msg: '',

	collection: null,

	to_me: false,

	init: function()
	{
		this.bind('list:empty', this.render.bind(this, {empty: true}));
		this.bind('list:notempty', this.render.bind(this));

		this.track(this.collection, function(model, options) {
			return new SharingBoardsItemController({
				inject: this.el_list,
				model: model,
				to_me: this.to_me
			});
		}.bind(this));
	},

	render: function(options)
	{
		options || (options = {});
		this.html(view.render('sharing/boards/list', {
			title: 'Boards',
			empty: options.empty === true
		}));
	}
});

