const SidebarBoardsController = Composer.Controller.extend({
	xdom: true,
	collection: null,

	elements: {
		'.filter input[name=filter]': 'inp_board_filter',
	},

	events: {
		'input .boards .filter input[name=filter]': 'filter_boards',
		'keyup .boards .filter input[name=filter]': 'filter_boards',
		'click .boards .filter icon': 'clear_board_filter',
		'click .boards li.add a': 'add_board',
		'click .boards a.edit': 'edit_board',
		'click .boards a.go': 'close',
	},

	boards: null,
	board_filter: null,
	viewstate: {},
	sortfn: function(_) { return 0; },

	init: function() {
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
			sortfn: this.sortfn(function(a, b) { return a.get('title', '').localeCompare(b.get('title', '')); }),
		});

		this.render();

		this.with_bind(turtl.controllers.pages, 'prerelease', function() {
			if(this.boards) this.boards.refresh();
			this.render();
		}.bind(this));

		var render_timer = new Timer(50);
		this.with_bind(render_timer, 'fired', this.render.bind(this));
		this.bind('render-async', render_timer.reset.bind(render_timer));
		this.bind('board-filter', function() {
			this.boards && this.boards.refresh({diff_events: false});
			this.trigger('render-async');
		}.bind(this));

		this.with_bind(this.boards, ['add', 'remove', 'change', 'reset'], this.trigger.bind(this, 'render-async'));

		this.bind('release', function() {
			this.boards.detach();
			this.boards = null;
		}.bind(this));
	},

	render: function() {
		if(!turtl.profile) return Promise.resolve();
		var current_space = turtl.profile.current_space();
		if(!current_space) return Promise.resolve();
		var cur_space = current_space.toJSON();
		var in_all_notes = turtl.router.cur_path().match(/\/spaces\/[^\/]+\/notes/);
		var cur_board_id = turtl.param_router.get().board_id;

		return this.html(view.render('sidebar/boards', {
			state: this.viewstate,
			cur_space: cur_space,
			in_all_notes: in_all_notes,
			cur_board_id: cur_board_id,
			can_add_boards: this.viewstate.edit_icons && current_space.can_i(Permissions.permissions.add_board),
			can_edit_boards: this.viewstate.edit_icons && current_space.can_i(Permissions.permissions.edit_board),
			boards: this.boards.toJSON(),
			board_filter_active: !!this.board_filter,
		}));
	},

	filter_boards: function(e) {
		var filter = this.inp_board_filter.get('value');
		if(e) {
			if(e.key == 'enter') {
				var board_a = this.el.getElement('ul.boards li a.go');
				if(board_a) board_a.click();
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

	clear_board_filter: function(e) {
		var current = this.inp_board_filter.get('value');
		if(current == '') return;
		this.inp_board_filter.set('value', '');
		this.filter_boards();
	},

	add_board: function(e) {
		if(e) e.stop();
		this.close();
		new BoardsEditController({
			model: new Board({space_id: turtl.profile.current_space().id()}),
		});
	},

	edit_board: function(e) {
		if(e) e.stop();
		var li = Composer.find_parent('li', e.target);
		if(!li) return;
		var board_id = li.get('rel');
		if(!board_id) return;

		this.close();
		var board = turtl.profile.get('boards').get(board_id);
		new BoardsEditController({
			model: board,
		});
	},

	close: function(e) {
		this.trigger('close');
	},
});

