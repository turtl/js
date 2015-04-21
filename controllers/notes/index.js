var NotesIndexController = Composer.Controller.extend({
	elements: {
		'> .notes': 'note_list'
	},

	board: null,
	search: {
		text: '',
		boards: [],
		tags: [],
		sort: ['id', 'desc'],
		page: 1,
		per_page: 100
	},
	board_id: null,


	init: function()
	{
		if(this.board_id == 'all')
		{
			var title = 'All notes';
			var back = undefined;
		}
		else
		{
			var board = turtl.profile.get('boards').find_by_id(this.board_id);
			if(!board)
			{
				barfr.barf('That board doesn\'t seem to exist');
				log.error('notes: index: bad board id: ', this.board_id);
				window.history.go(-1);
			}
			this.search.boards.push(this.board_id);
			this.search.boards = this.search.boards.concat(board.get_child_board_ids());

			var parent_id = board.get('parent_id');
			var parent = turtl.profile.get('boards').find_by_id(parent_id);
			var title = board.get('title');
			if(parent)
			{
				title = parent.get('title') + '/' + title;
			}
			var back = '/boards';
		}

		turtl.push_title(title, back);
		this.bind('release', turtl.pop_title.bind(null, false));

		turtl.events.trigger('header:set-actions', [
			{name: 'search', icon: '&#xe83a;'},
		]);
		this.with_bind(turtl.events, 'header:fire-action', function(name) {
			switch(name)
			{
				case 'search':
					this.open_search();
					break;
			}
		}.bind(this));

		this.render();

		// set up the action button
		this.track_subcontroller('actions', function() {
			var actions = new ActionController();
			actions.set_actions([
				{title: 'Text note', name: 'text', icon: '&#xe804;'},
				{title: 'Bookmark', name: 'link', icon: '&#xe814;'},
				{title: 'Image', name: 'image', icon: '&#xe80e;'}
			]);
			this.with_bind(actions, 'actions:fire', this.open_add.bind(this));
			return actions;
		}.bind(this));
	},

	render: function()
	{
		this.html(view.render('notes/index', {}));
		this.track_subcontroller('list', function() {
			return new NotesListController({
				inject: this.note_list,
				search: this.search
			});
		}.bind(this));
	},

	open_add: function(type)
	{
		new NotesEditController({
			type: type,
			board_id: this.board_id
		});
	},

	open_search: function()
	{
		var tags = this.get_subcontroller('list').tags;
		var search = new NotesSearchController({
			tags: tags,
			search: this.search
		});
		search.bind('do-search', function() {
			this.get_subcontroller('list').trigger('search');
		}.bind(this))
	}
});

