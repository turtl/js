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

	elements: {
		'> .overlay': 'overlay',
		'> .inner': 'el_inner',
		'.spaces-container': 'el_spaces',
		'.boards .filter input[name=filter]': 'inp_filter',
	},

	events: {
		'click > .overlay': 'close',
		'click .header h2': 'open_spaces',
		'click .spaces-container h2': 'close_spaces',
		'click .spaces li.add a': 'add_space',
		'click .spaces a.edit': 'edit_space',
		'click .boards li.add a': 'add_board',
		'click .boards a.edit': 'edit_board',
		// close when clicking one of the sidebar links
		'click ul.spaces a': 'close_spaces_del',
		'click ul.boards a': 'close',
		'input .boards .filter input[name=filter]': 'filter_boards',
		'keyup .boards .filter input[name=filter]': 'filter_boards',
		'click .boards .filter icon': 'clear_board_filter',
	},

	is_open: false,
	boards: null,

	board_filter: null,

	init: function()
	{
		this.with_bind(turtl.events, 'app:objects-loaded', function() {
			this.boards = new BoardsFilter(turtl.profile.get('boards'), {
				filter: function(b) {
					var is_in_space = b.get('space_id') == turtl.profile.current_space().id();
					var is_in_filter = this.board_filter ?
						b.get('title').toLowerCase().indexOf(this.board_filter.toLowerCase()) >= 0 :
						true;
					return is_in_space && is_in_filter;
				}.bind(this),
			});
			this.bind('board-filter', function() {
				this.boards && this.boards.refresh({diff_events: true});
				this.render();
			}.bind(this));
			this.with_bind(this.boards, ['add', 'remove', 'change'], this.render.bind(this));
			this.with_bind(turtl.profile.get('spaces'), ['add', 'remove', 'change'], this.render.bind(this));
			this.bind('release', function() {
				this.boards = null;
			}.bind(this));
		}.bind(this));

		this.render();

		this.with_bind(turtl.events, 'profile:set-current-space', function() {
			this.boards.refresh();
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
	},

	render: function()
	{
		if(!this.boards) return;
		if(!turtl.profile) return;
		var current_space = turtl.profile.current_space();
		var spaces = turtl.profile.get('spaces');
		var space_data = spaces.toJSON()
			.map(function(space) { 
				if(space.id == current_space.id()) space.current = true;
				space.color = spaces.get(space.id).get_color();
				return space;
			});
		var cur_space = current_space.toJSON();
		cur_space.color = current_space.get_color();
		return this.html(view.render('modules/sidebar', {
			cur_space: cur_space,
			spaces: space_data,
			boards: this.boards.toJSON(),
			open: this.is_open,
			space_state: this.space_state,
			last_sync: (turtl.sync || {}).last_sync,
			polling: (turtl.sync || {})._polling,
			filter_active: !!this.board_filter,
		})).then(function() {
			this.fix_swiping();
		}.bind(this))
	},

	open: function()
	{
		this.is_open = true;
		//this.clear_board_filter();
		document.body.addClass('settings');
		setTimeout(this.render.bind(this), 10);
		turtl.events.trigger('sidebar:open');
		setTimeout(function() {
			if(get_platform() != 'mobile') this.inp_filter.focus();
		}.bind(this), 100);
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
		this.clear_board_filter();
		this.inp_filter.blur();
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

		// apply the "Scroll" class pre-emptively if our space content is going
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
		this.render();
	},

	close_spaces_del: function(e)
	{
		this.space_state.open = false;
		var spaces_height = this.el_spaces.getElement('>.gutter').getCoordinates().height;
		var delay_scroll = spaces_height > window.getHeight();
		if(!delay_scroll) this.space_state.scroll = false;
		this.render();
		setTimeout(function() {
			this.space_state.zin = false;
			if(delay_scroll) this.space_state.scroll = false;
			this.render();
		}.bind(this), 300);
	},

	close_spaces: function(e)
	{
		if(e) e.stop();
		this.close_spaces_del();
	},

	add_space: function(e)
	{
		if(e) e.stop();
		new SpacesEditController();
		this.close();
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
		new BoardsEditController({
			model: new Board({space_id: turtl.profile.current_space().id()}),
		});
		this.close();
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

	filter_boards: function(e)
	{
		var filter = this.inp_filter.get('value');
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
				this.inp_filter.set('value', '');
			}
		}
		this.board_filter = filter ? filter : null;
		this.trigger('board-filter');
	},

	clear_board_filter: function(e)
	{
		this.inp_filter.set('value', '');
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
});

