var NotesIndexController = Composer.Controller.extend({
	class_name: 'notes-container',

	elements: {
		'> .notes': 'note_list'
	},

	search: {
		text: '',
		space: null,
		board: null,
		tags: [],
		exclude_tags: [],
		sort: NOTE_DEFAULT_SORT,
		page: 1,
		per_page: 100
	},
	board_id: null,
	notes: null,

	// holds the available tags from the last search, and is passed into the
	// search controller. basically, this holds state so the search controller
	// doesn't have to run the same search twice to get data that we already
	// have access to here
	saved_tags: null,

	init: function()
	{
		const context = turtl.context.grab(this);
		var space = turtl.profile.current_space();
		var space_id = space.id();
		this.search.space = space_id;
		if(this.board_id == 'all' || !this.board_id)
		{
			var title = i18next.t("All notes");
			var back = undefined;
		}
		else
		{
			var board = turtl.profile.get('boards').find_by_id(this.board_id);
			if(!board)
			{
				barfr.barf(i18next.t('That board doesn\'t seem to exist'));
				log.error('notes: index: bad board id: ', this.board_id);
				window.history.go(-1);
			}
			this.search.board = this.board_id;

			var title = board.get('title');
			var back = turtl.router.get_param(window.location.search, 'back');
			this.with_bind(board, 'change:title', function() {
				turtl.controllers.header.update_title(board.get('title'));
			}.bind(this));
		}

		this.notes = new Notes();
		this.notes.sortfn = function(a, b) {
			var field = this.search.sort[0];
			var dir = this.search.sort[1];
			if(dir == 'desc') {
				var _tmp = a;
				a = b;
				b = _tmp;
			}
			switch(field) {
				case 'mod':
					return a.get('mod') - b.get('mod');
					break;
				case 'created':
				default:
					return a.id().localeCompare(b.id());
					break;
			}
		}.bind(this);

		turtl.push_title(title, back, {prefix_space: true});
		this.bind('release', turtl.pop_title.bind(null, false));

		// if our space is removed from under us, route to the next best space
		this.with_bind(space, 'destroy', function() {
			if(!turtl.profile) return;
			if(turtl.profile.current_space().id() != space.id()) return;
			// note, this would fire BEFORE the space is removed from the spaces
			// collection, so we need to wait for the event chain to propagate
			// (and the space to be removed) before selcting the next space
			setTimeout(function() {
				turtl.route_to_space();
			});
		});

		var invites = turtl.profile.get('invites');
		var set_header_actions = function() {
			var header_actions = [];
			if(invites.size() > 0) {
				header_actions.push({name: 'invites', icon: 'notification', class: 'notification mod bottom'});
			}
			header_actions.push({name: 'search', icon: 'search'});
			header_actions.push({name: 'menu', actions: [
				{name: i18next.t('Share this space'), href: '/spaces/'+space_id+'/sharing', rel: 'share-this-space'},
				{name: i18next.t('Settings'), href: '/settings', rel: 'settings'},
			]});
			turtl.events.trigger('header:set-actions', header_actions);
		}.bind(this);
		set_header_actions();
		this.with_bind(invites, ['add', 'remove', 'reset', 'clear'], set_header_actions);
		this.with_bind(turtl.events, 'header:fire-action', function(name) {
			switch(name) {
				case 'invites': turtl.route('/invites'); break;
				case 'search': this.open_search(); break;
			}
		}.bind(this));
		this.with_bind(turtl.events, 'header:menu:fire-action', function(action, atag) {
			turtl.back.push(turtl.route.bind(turtl, turtl.router.cur_path()));
			turtl.route(atag.get('href'));
		}.bind(this));
		this.with_bind(turtl.events, 'search:toggle', this.toggle_search.bind(this));
		this.with_bind(context, '/', this.open_search.bind(this));
		this.with_bind(context, 'x', this.clear_search.bind(this));

		this.render();

		var setup_actions = function() {
			this.remove('actions');
			if(!space.can_i(Permissions.permissions.add_note)) return;

			// set up the action button
			this.sub('actions', function() {
				var actions = new ActionController({
					context: context,
				});
				actions.set_actions([
					{title: i18next.t('Text note'), name: 'text', icon: 'write', shortcut: 't'},
					{title: i18next.t('Bookmark'), name: 'link', icon: 'bookmark', shortcut: 'b'},
					{title: i18next.t('Image'), name: 'image', icon: 'image', shortcut: 'i'},
					{title: i18next.t('File'), name: 'file', icon: 'file', shortcut: 'f'},
					{title: i18next.t('Password'), name: 'password', icon: 'password', shortcut: 'p'}
				]);
				this.with_bind(actions, 'actions:fire', this.open_add.bind(this), 'notes:action-fire:open-add');
				this.with_bind(context, 'a', function() {
					if(actions.is_open) return;
					actions.open();
				}, 'notes:keyboard:open-add');
				return actions;
			}.bind(this));
		}.bind(this);
		setup_actions();
		this.with_bind(space.get('members'), ['change', 'reset'], setup_actions);

		this.with_bind(turtl.search, 'search-tags', function(tags) {
			this.saved_tags = tags;
		}.bind(this));

		this.bind('search-reset', function(options) {
			options || (options = {});
			var searchcon = this.sub('search');
			if(searchcon) {
				searchcon.clear_search(this.search);
				if(!options.from_search) searchcon.reset_search();
			} else {
				NotesSearchController.prototype.clear_search(this.search);
			}

			this.trigger('run-search');
			var list = this.sub('list');
			if(list) list.trigger('search-reset');
			var search_btn = $E('header li[rel=search]');
			search_btn.removeClass('mod');
		}.bind(this));
		this.bind('search-mod', function() {
			var search_btn = $E('header li[rel=search]');
			search_btn.addClass('mod');
		}.bind(this));
		this.bind('run-search', function() {
			var list = this.sub('list');
			if(list) list.trigger('run-search', {reset_pages: true, scroll_to_top: true});
		}.bind(this));
	},

	render: function()
	{
		this.html(view.render('notes/index', {}));
		this.sub('list', function() {
			return new NotesListController({
				inject: this.note_list,
				search: this.search,
				notes: this.notes,
			});
		}.bind(this));
	},

	open_add: function(type)
	{
		new NotesEditController({
			type: type,
			board_id: turtl.param_router.get().board_id,
		});
	},

	toggle_search: function()
	{
		var search = this.sub('search');
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
		this.sub('search', function() {
			var search = new NotesSearchController({
				search: this.search
			});
			return search;
		}.bind(this));
		var search = this.sub('search');

		search.bind('do-search', this.trigger.bind(this, 'run-search'));
		search.bind('search-reset', this.trigger.bind(this, 'search-reset'));
		search.bind('search-mod', this.trigger.bind(this, 'search-mod'));

		// if we have save tags, hand them to the search controller
		if(this.saved_tags) {
			search.trigger('update-available-tags', this.saved_tags);
		}
	},

	clear_search: function(e)
	{
		this.trigger('search-reset');
	}
});

