var BoardsShareListController = Composer.ListController.extend({
	elements: {
	},

	events: {
	},

	model: null,
	collection: null,
	filter: null,

	pending: false,

	init: function()
	{
		if(this.pending)
		{
			var board_id = this.model.id();
			this.filter = new Composer.FilterCollection(this.collection, {
				filter: function(model)
				{
					return model.get('object_id') == board_id;
				}
			});
		}
		else
		{
			this.filter = new Composer.FilterCollection(this.collection, {
				filter: function() { return true; }
			});
		}
		this.track(this.filter, function(model, options) {
			return new BoardsShareItemController({
				inject: this.el,
				pending: this.pending,
				model: model
			});
		}.bind(this));
	}
});

