// TODO: don't set classes manually. use scoped state tracking and re-render. ex:
//  - open/close (spaces)
var SidebarController = Composer.Controller.extend({
	xdom: true,
	el: '#sidebar',

	is_open: false,
	space_state: {
		open: false,
		zin: false,
		scroll: false,
	},

	view_state: {
		edit_icons: true,
	},

	elements: {
		'> .overlay': 'overlay',
		'> .inner': 'el_inner',
		'.spaces-container': 'el_spaces',
		'.spaces .filter input[name=filter]': 'inp_space_filter',
		'.boards .filter input[name=filter]': 'inp_board_filter',
	},

	events: {
		'click > .overlay': 'close',
		'click .header h2': 'open_spaces',
		'click .spaces-container h2': 'close_spaces',
		'click .spaces li.add a': 'add_space',
		'click .spaces a.edit': 'edit_space',
		'click .boards li.add a': 'add_board',
		'click .boards a.edit': 'edit_board',
		'click .boards a.go': 'close',
		'click ul.spaces a': 'close_spaces_del',
		'input .spaces .filter input[name=filter]': 'filter_spaces',
		'keyup .spaces .filter input[name=filter]': 'filter_spaces',
		'click .spaces .filter icon': 'clear_space_filter',
		'input .boards .filter input[name=filter]': 'filter_boards',
		'keyup .boards .filter input[name=filter]': 'filter_boards',
		'click .boards .filter icon': 'clear_board_filter',
	},

	is_open: false,
	spaces: null,
	boards: null,

	space_filter: null,
	board_filter: null,

	skip_close_on_next_route: false,

	init: function()
	{
		this.with_bind(turtl.events, 'app:objects-loaded', function() {
			// a sort function that makes fuzzy searching a bit more natural
			var fuzzy_sort = function(default_sort) {
				return function(a, b) {
					var a_title = a.get('title', '');
					var b_title = b.get('title', '');
					if(this.board_filter) {
						var a_title_lc = a_title.toLowerCase();
						var b_title_lc = b_title.toLowerCase();
						var filter = this.board_filter.toLowerCase();
						if(a_title == filter) return -1;
						if(b_title == filter) return 1;
						var a_idx = a_title_lc.indexOf(filter);
						var b_idx = b_title_lc.indexOf(filter);
						if(a_idx == 0) return -1;
						if(b_idx == 0) return 1;
						if(!(a_idx >= 0 && b_idx >= 0)) {
							if(a_idx) return -1;
							if(b_idx) return 1;
						}
					}
					return default_sort(a, b);
				}.bind(this);
			}.bind(this);

			this.spaces = new Composer.FilterCollection(turtl.profile.get('spaces'), {
				filter: function(b) {
					var is_in_filter = this.space_filter ?
						fuzzysearch(this.space_filter.toLowerCase(), b.get('title').toLowerCase()) :
						true;
					return is_in_filter;
				}.bind(this),
				sortfn: fuzzy_sort(Spaces.prototype.sortfn),
			});
			this.boards = new BoardsFilter(turtl.profile.get('boards'), {
				filter: function(b) {
					if(!turtl.profile) return false;
					if(!b) return false;
					var is_in_space = b.get('space_id') == turtl.profile.current_space().id();
					var is_in_filter = this.board_filter ?
						fuzzysearch(this.board_filter.toLowerCase(), b.get('title').toLowerCase()) :
						true;
					return is_in_space && is_in_filter;
				}.bind(this),
				sortfn: fuzzy_sort(function(a, b) { return a.get('title', '').localeCompare(b.get('title', '')); }),
			});
			this.bind('space-filter', function() {
				this.spaces && this.spaces.refresh({diff_events: false});
				this.render();
			}.bind(this));
			this.bind('board-filter', function() {
				this.boards && this.boards.refresh({diff_events: false});
				this.render();
			}.bind(this));
			this.with_bind(this.boards, ['add', 'remove', 'change'], this.render.bind(this));
			this.with_bind(this.spaces, ['add', 'remove', 'change'], this.render.bind(this));
			this.bind('release', function() {
				this.spaces.detach();
				this.boards.detach();
				this.spaces = null;
				this.boards = null;
			}.bind(this));
		}.bind(this));

		this.render();

		this.with_bind(turtl.controllers.pages, 'prerelease', function() {
			if(this.boards) this.boards.refresh();
			this.render();
		}.bind(this));
		this.with_bind(turtl.events, 'sidebar:toggle', this.toggle.bind(this));
		this.with_bind(turtl.events, 'app:load:profile-loaded', this.render.bind(this));

		this.with_bind(turtl.user, 'login', function() {
			this.with_bind(turtl.profile.get('spaces'), ['change', 'add', 'remove', 'reset'], this.render.bind(this), 'sidebar:spaces:render');
		}, 'sidebar:login:render');

		var hammer = new Hammer.Manager(this.el);
		hammer.add(new Hammer.Press({time: 750}));
		hammer.add(new Hammer.Swipe());
		hammer.on('press', function(e) {
			var li = Composer.find_parent('li.space, li.board', e.target);
			if(!li) return;
			var settings = li.getElement('a.edit');
			if(!settings) return;
			settings.click();
		}, {time: 5000});
		hammer.on('swipeleft', this.close.bind(this));
		this.bind('release', hammer.destroy.bind(hammer));

		this.with_bind(turtl.keyboard, 'esc', this.close.bind(this));

		// close when switching pages, UNLESS we specifically ask not to
		this.with_bind(turtl.controllers.pages, 'prerelease', function() {
			if(!this.skip_close_on_next_route) this.close();
			this.skip_close_on_next_route = false;
		}.bind(this), 'pages:close-on-page');
	},

	render: function()
	{
		if(!this.boards) return;
		if(!turtl.profile) return;
		var current_space = turtl.profile.current_space();
		if(!current_space) return;
		var spaces = this.spaces;
		var space_data = spaces
			.toJSON()
			.map(function(space) { 
				if(space.id == current_space.id()) space.current = true;
				space.color = spaces.get(space.id).get_color();
				return space;
			});
		var cur_space = current_space.toJSON();
		cur_space.color = current_space.get_color();
		var cur_space_id = current_space.id();
		var cur_board_id = turtl.param_router.get().board_id;
		var in_all_notes = turtl.router.cur_path().match(/\/spaces\/[^\/]+\/notes/);
		return this.html(view.render('modules/sidebar', {
			state: this.view_state,
			cur_space: cur_space,
			cur_space_id: cur_space_id,
			in_all_notes: in_all_notes,
			cur_board_id: cur_board_id,
			spaces: space_data,
			boards: this.boards.toJSON(),
			can_add_boards: this.view_state.edit_icons && current_space.can_i(Permissions.permissions.add_board),
			can_edit_boards: this.view_state.edit_icons && current_space.can_i(Permissions.permissions.edit_board),
			open: this.is_open,
			space_state: this.space_state,
			last_sync: (turtl.sync || {}).last_sync,
			polling: (turtl.sync || {})._polling,
			space_filter_active: !!this.space_filter,
			board_filter_active: !!this.board_filter,
		})).then(function() {
			this.fix_swiping();
		}.bind(this))
	},

	open: function()
	{
		this.is_open = true;
		document.body.addClass('settings');
		setTimeout(this.render.bind(this), 10);
		turtl.events.trigger('sidebar:open');
		this.focus_if(this.inp_board_filter);
	},

	close: function()
	{
		this.close_spaces();
		if(!this.overlay) return;
		this.is_open = false;
		this.overlay.setStyles({position: 'fixed'});
		this.render();
		setTimeout(function() {
			this.overlay.setStyles({position: ''});
		}.bind(this), 300);
		document.body.removeClass('settings');
		turtl.events.trigger('sidebar:close');
		this.clear_space_filter();
		this.clear_board_filter();
		setTimeout(function() {
			this.inp_space_filter.blur();
			this.inp_board_filter.blur();
		}.bind(this));
	},

	toggle: function()
	{
		if(!turtl.user.logged_in) return;
		if(document.body.hasClass('settings'))
		{
			this.close();
		}
		else
		{
			this.open();
		}
	},

	open_spaces: function(e)
	{
		if(e) e.stop();
		this.space_state.open = true;
		this.space_state.zin = true;

		if(!this.el_spaces) return;

		// apply the "scroll" class pre-emptively if our space content is going
		// to be larger than the window vertically. otherwise, apply it after
		// the space container expands fully.
		//
		// the purpose of all this is to eliminate the scrollbar flashing and
		// disappearing when opening/closing the spaces menu.
		var spaces_height = this.el_spaces.getElement('>.gutter').getCoordinates().height;
		if(spaces_height > window.getHeight()) {
			this.space_state.scroll = true;
		} else {
			setTimeout(function() {
				this.space_state.scroll = true;
				this.render();
			}.bind(this), 300);
		}
		this.render()
			.bind(this)
			.then(function() {
				setTimeout(function() {
					if(get_platform() != 'mobile') this.inp_space_filter.focus();
				}.bind(this), 100);
			});
	},

	close_spaces_del: function(e)
	{
		if(!this.el_spaces) return;
		this.skip_close_on_next_route = true;
		this.space_state.open = false;
		var spaces_height = this.el_spaces.getElement('>.gutter').getCoordinates().height;
		var delay_scroll = spaces_height > window.getHeight();
		if(!delay_scroll) this.space_state.scroll = false;
		this.render();
		setTimeout(function() {
			if(this.space_state.open) return;
			this.skip_close_on_next_route = false;
			this.space_state.zin = false;
			if(delay_scroll) this.space_state.scroll = false;
			this.render();
			this.clear_space_filter();
		}.bind(this), 300);
		this.inp_space_filter.blur();
		this.focus_if(this.inp_board_filter, {delay: 5});
		this.clear_board_filter();
	},

	close_spaces: function(e)
	{
		if(e) e.stop();
		this.close_spaces_del();
	},

	add_space: function(e)
	{
		if(e) e.stop();
		this.close();
		new SpacesEditController();
	},

	edit_space: function(e)
	{
		if(e) e.stop();
		var li = Composer.find_parent('li', e.target);
		if(!li) return;
		var space_id = li.get('rel');
		if(!space_id) return;
		var space = turtl.profile.get('spaces').get(space_id);
		new SpacesEditController({
			model: space,
		});
		this.close();
	},

	add_board: function(e)
	{
		if(e) e.stop();
		this.close();
		new BoardsEditController({
			model: new Board({space_id: turtl.profile.current_space().id()}),
		});
	},

	edit_board: function(e)
	{
		if(e) e.stop();
		var li = Composer.find_parent('li', e.target);
		if(!li) return;
		var board_id = li.get('rel');
		if(!board_id) return;
		var board = turtl.profile.get('boards').get(board_id);
		new BoardsEditController({
			model: board,
		});
		this.close();
	},

	filter_spaces: function(e)
	{
		var filter = this.inp_space_filter.get('value');
		if(e) {
			if(e.key == 'enter') {
				var space_a = this.el.getElement('ul.spaces li a.go');
				if(space_a) space_a.click();
				return;
			}
			if(e.key == 'esc') {
				e.stop();
				// if hitting esc on empty filters, close sidebar
				if(filter == '') return this.close();
				filter = null;
				this.inp_space_filter.set('value', '');
			}
		}
		this.space_filter = filter ? filter : null;
		this.trigger('space-filter');
	},

	clear_space_filter: function(e)
	{
		this.inp_space_filter.set('value', '');
		this.filter_spaces();
	},

	filter_boards: function(e)
	{
		var filter = this.inp_board_filter.get('value');
		if(e) {
			if(e.key == 'enter') {
				var board_a = this.el.getElement('ul.boards li a.go');
				if(board_a) {
					var li = Composer.find_parent('li.board', board_a);
					var bid = li && li.get('rel');
					board_a.click();
				}
				return;
			}
			if(e.key == 'esc') {
				e.stop();
				// if hitting esc on empty filters, close sidebar
				if(filter == '') return this.close();
				filter = null;
				this.inp_board_filter.set('value', '');
			}
		}
		this.board_filter = filter ? filter : null;
		this.trigger('board-filter');
	},

	clear_board_filter: function(e)
	{
		this.inp_board_filter.set('value', '');
		this.filter_boards();
	},

	fix_swiping: function()
	{
		// NOTE: for some reason, the swipe events don't propagate from the
		// .inner div unless we specifically add them by hand here.
		if(!this._swipe_hammers) this._swipe_hammers = [];
		if(this._swipe_hammers.length) {
			this._swipe_hammers.forEach(function(s) { s.destroy(); });
			this._swipe_hammers = [];
		}
		var make_hammer = function(el) {
			if(!el) return;
			var hammer = new Hammer.Manager(el);
			hammer.add(new Hammer.Swipe());
			this._swipe_hammers.push(hammer);
		}.bind(this);
		make_hammer(this.el_inner);
		make_hammer(this.el_spaces.getElement('.gutter'));
	},

	focus_if: function(el, options) {
		options || (options = {});
		if(!el) return;

		if(get_platform() == 'mobile') return;
		if(options.delay === undefined) {
			setTimeout(function() { el.focus(); }, 100);
		} else {
			setTimeout(function() { el.focus(); }, options.delay);
		}
	},
});

