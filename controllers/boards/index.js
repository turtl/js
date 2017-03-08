var BoardsController = Composer.Controller.extend({
	class_name: 'boards-index',

	elements: {
		'.boards-list': 'board_list',
		'.search input[name=search]': 'inp_search',
		'.search icon.close': 'icon_close'
	},

	events: {
		'input .search input[name=search]': 'board_filter',
		'keydown .search input[name=search]': 'special_key',
		'click .search icon.close': 'clear_filter',
		'submit form': 'open_board'
	},

	collection: null,

	init: function()
	{
		turtl.push_title('', null, {prefix_space: true});
		this.bind('release', turtl.pop_title.bind(null, false));

		this.collection = new BoardsFilter(turtl.profile.get('boards'));

		this.bind('release', this.collection.detach.bind(this.collection));

		this.render();

		turtl.events.trigger('header:set-actions', [
			{name: 'menu', actions: [
				{name: 'Settings', href: '/settings'}
			]},
		]);
		this.with_bind(turtl.events, 'header:menu:fire-action', function(action) {
			switch(action)
			{
				case 'settings': turtl.route('/settings'); break;
			}
		}.bind(this));

		// set up the action button
		this.track_subcontroller('actions', function() {
			var actions = new ActionController();
			actions.set_actions([{title: i18next.t('Create a board'), name: 'add'}]);
			this.with_bind(actions, 'actions:fire', function(action) {
				switch(action)
				{
					case 'add': this.open_add(); break;
				}
			}.bind(this));
			return actions;
		}.bind(this));

		this.with_bind(turtl.keyboard, 'a', this.open_add.bind(this));
	},

	render: function()
	{
		this.html(view.render('boards/index', {
			show_search: this.collection.size() > 0
		}));
		if(this.inp_search) setTimeout(function() { this.inp_search.focus(); }.bind(this));

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

	special_key: function(e)
	{
		if(!e) return;
		if(e.key != 'esc') return;
		this.clear_filter(e);
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

