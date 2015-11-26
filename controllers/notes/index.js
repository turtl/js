var NotesIndexController = Composer.Controller.extend({
	class_name: 'notes-container',

	elements: {
		'> .notes': 'note_list'
	},

	board: null,
	search: {
		text: '',
		boards: [],
		tags: [],
		sort: NOTE_DEFAULT_SORT,
		page: 1,
		per_page: 100
	},
	board_id: null,

	// holds the available tags from the last search, and is passed into the
	// search controller. basically, this holds state so the search controller
	// doesn't have to run the same search twice to get data that we already
	// have access to here
	saved_tags: null,

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
			var back = turtl.router.get_param(window.location.search, 'back');
			if(!back) back = '/boards';
		}

		var tagsearch = clone(this.search);
		this.with_bind(turtl.profile.get('notes'), ['add', 'remove', 'clear', 'reset'], function() {
			var list = this.get_subcontroller('list');
			if(!list) return;
			turtl.search.search(tagsearch)
				.spread(function(_, tags) {
					list.tags = tags;
				});
		}.bind(this));

		turtl.push_title(title, back);
		this.bind('release', turtl.pop_title.bind(null, false));

		turtl.events.trigger('header:set-actions', [
			{name: 'search', icon: 'search'}
		]);
		this.with_bind(turtl.events, 'header:fire-action', function(name) {
			switch(name)
			{
				case 'search':
					this.open_search();
					break;
			}
		}.bind(this));
		this.with_bind(turtl.events, 'search:toggle', this.toggle_search.bind(this));
		this.with_bind(turtl.keyboard, '/', this.open_search.bind(this));
		this.with_bind(turtl.keyboard, 'x', this.clear_search.bind(this));

		this.render();

		// set up the action button
		this.track_subcontroller('actions', function() {
			var actions = new ActionController();
			actions.set_actions([
				{title: 'Text note', name: 'text', icon: 'write', shortcut: 't'},
				{title: 'Bookmark', name: 'link', icon: 'bookmark', shortcut: 'b'},
				{title: 'Image', name: 'image', icon: 'image', shortcut: 'i'},
				{title: 'File', name: 'file', icon: 'file', shortcut: 'f'}
			]);
			this.with_bind(actions, 'actions:fire', this.open_add.bind(this));
			this.with_bind(turtl.keyboard, 'a', function() {
				if(actions.is_open) return;
				actions.open();
			});
			return actions;
		}.bind(this));

		this.with_bind(turtl.search, 'search-tags', function(tags) {
			this.saved_tags = tags;
		}.bind(this));

		this.bind('search-reset', function() {
			this.search.sort = NOTE_DEFAULT_SORT;
			this.search.text = '';
			this.search.tags = [];
			this.search.colors = [];
			this.trigger('run-search');
			var search_btn = $E('header li[rel=search]');
			search_btn.removeClass('mod');
		}.bind(this));
		this.bind('search-mod', function() {
			var search_btn = $E('header li[rel=search]');
			search_btn.addClass('mod');
		}.bind(this));
		this.bind('run-search', function() {
			var list = this.get_subcontroller('list');
			if(list) list.trigger('search');
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

	toggle_search: function()
	{
		var search = this.get_subcontroller('search');
		if(search)
		{
			search.release();
		}
		else
		{
			this.open_search();
		}
	},

	open_search: function()
	{
		var tags = this.get_subcontroller('list').tags;
		this.track_subcontroller('search', function() {
			var search = new NotesSearchController({
				tags: tags,
				search: this.search
			});
			return search;
		}.bind(this));
		var search = this.get_subcontroller('search');

		search.bind('do-search', this.trigger.bind(this, 'run-search'));
		search.bind('search-reset', this.trigger.bind(this, 'search-reset'));
		search.bind('search-mod', this.trigger.bind(this, 'search-mod'));

		// if we have save tags, hand them to the search controller
		if(this.saved_tags)
		{
			search.trigger('update-available-tags', this.saved_tags);
		}
	},

	clear_search: function(e)
	{
		this.trigger('search-reset');
	}
});

