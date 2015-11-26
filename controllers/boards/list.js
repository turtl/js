var BoardsListController = Composer.ListController.extend({
	elements: {
		'ul': 'board_list',
		'.search input[name=search]': 'inp_search'
	},

	collection: null,
	child: false,

	search: {filter: null},

	init: function()
	{
		this.bind('list:empty', this.render.bind(this, {empty: true}));
		this.bind('list:notempty', this.render.bind(this));

		var filter = new Composer.FilterCollection(this.collection, {
			filter: function(model)
			{
				var search = this.search.filter;
				if(!search) return true;
				var match = model.get('title').toLowerCase().indexOf(search.toLowerCase()) >= 0;
				if(match) return true;
				if(!model.get('boards').size()) return false;

				var subs = model.get('boards').models();
				for(var i = 0, n = subs.length; i < n; i++)
				{
					var sub = subs[i];
					match = sub.get('title').toLowerCase().indexOf(search.toLowerCase()) >= 0;
					if(match) break;
				}
				return match;
			}.bind(this)
		});
		this.bind('board-filter', function(search) {
			this.search.filter = search;
			filter.refresh();
		}.bind(this));

		this.track(filter, function(model, options) {
			options || (options = {});
			var fragment = options.fragment;
			return new BoardsItemController({
				inject: fragment ? fragment : this.board_list,
				model: model,
				search: this.search
			});
		}.bind(this), {
			bind_reset: true,
			fragment_on_reset: function() { return this.board_list; }.bind(this)
		});
	},

	render: function(options)
	{
		options || (options = {});
		this.html(view.render('boards/list', {
			empty: options.empty && (this.child || !this.search.filter),
			show_search: !this.child,
			child: this.child
		}));
	}
});

