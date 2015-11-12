var BoardsController = Composer.Controller.extend({
	class_name: 'boards-index',

	elements: {
		'.boards-list': 'board_list',
		'.search input[name=search]': 'inp_search',
		'.search icon.close': 'icon_close'
	},

	events: {
		'input .search input[name=search]': 'board_filter',
		'click .search icon.close': 'clear_filter',
		'submit form': 'open_board'
	},

	collection: null,

	init: function()
	{
		turtl.push_title('Boards');
		this.bind('release', turtl.pop_title.bind(null, false));

		this.collection = new BoardsFilter(turtl.profile.get('boards'), {
			filter: function(b) { return !b.get('parent_id'); }
		});

		this.bind('release', this.collection.detach.bind(this.collection));

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
		this.html(view.render('boards/index', {
			show_search: this.collection.size() > 0
		}));
		if(this.inp_search) this.inp_search.focus();

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
	},

	board_filter: function(e)
	{
		var filter = this.inp_search.get('value');
		if(filter == '') filter = null;
		var list = this.get_subcontroller('list')
		if(list) list.trigger('board-filter', filter);

		if(filter)
		{
			this.icon_close.addClass('active');
		}
		else
		{
			this.icon_close.removeClass('active');
		}
	},

	clear_filter: function(e)
	{
		if(e) e.stop();
		this.inp_search.set('value', '');
		this.board_filter();
		this.inp_search.focus();
	},

	open_board: function(e)
	{
		if(e) e.stop();
		var first = this.el.getElement('highlight');
		if(!first) return;
		var li = Composer.find_parent('li', first);
		if(!li) return;
		var board_id = li.get('rel');
		var board = turtl.profile.get('boards').get(board_id);
		if(board) board.trigger('navigate');
	}
});

