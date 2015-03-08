var NotesListController = Composer.ListController.extend({
	elements: {
		'ul': 'note_list'
	},

	collection: null,

	init: function()
	{
		this.bind('list:empty', this.render.bind(this, {empty: true}));
		this.bind('list:notempty', this.render.bind(this));

		var filter = new Composer.FilterCollection(this.collection, {
		});
		this.track(filter, function(model, options) {
			return new NotesItemController({
				inject: this.note_list,
				model: model
			});
		}.bind(this));
	},

	render: function(options)
	{
		options || (options = {});
		this.html(view.render('notes/list', {
			empty: options.empty
		}));
	}
});

