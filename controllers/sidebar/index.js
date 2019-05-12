const SidebarController = Composer.Controller.extend({
	xdom: true,
	el: '#sidebar',

	elements: {
		'> .overlay': 'overlay',
		'> .inner': 'el_inner',
		'.spaces-container': 'el_spaces',
		'.gutter.spaces': 'el_spaces_list',
		'.gutter.boards': 'el_boards_list',
		'.spaces .filter input[name=filter]': 'inp_space_filter',
	},

	events: {
		'click > .overlay': 'close',
		'click .header h2': 'open_spaces',
		'click .spaces-container h2': 'close_spaces',
		'click ul.spaces a': 'close_spaces_del',
	},

	space_state: {
		open: false,
		zin: false,
		scroll: false,
	},

	viewstate: {
		edit_icons: true,
	},

	is_open: false,
	spaces: null,
	boards: null,

	space_filter: null,
	board_filter: null,

	skip_close_on_next_route: false,

	init: function()
	{
		const context = turtl.context.grab(this);
		this.with_bind(turtl.user, 'profile-loaded', function() {
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

			this.render()
				.bind(this)
				.then(function() {
					// break spaces/boards out into subcontrollers so when the
					// main controller re-renders it doesnt have to redraw them
					// all (which was very laggy)
					this.sub('spaces', function() {
						var sub = new SidebarSpacesController({
							inject: this.el_spaces_list,
							viewstate: this.viewstate,
							sortfn: fuzzy_sort,
						});
						this.bind('focus-space-filter', function(opts) {
							this.focus_if(sub.inp_space_filter, opts);
						}.bind(this));
						this.bind('blur-space-filter', function() {
							if(sub.inp_space_filter) sub.inp_space_filter.blur();
						});
						this.with_bind(sub, 'close', this.close.bind(this));
						return sub;
					}.bind(this));
					this.sub('boards', function() {
						var sub = new SidebarBoardsController({
							inject: this.el_boards_list,
							viewstate: this.viewstate,
							sortfn: fuzzy_sort,
						});
						this.bind('focus-board-filter', function(opts) {
							this.focus_if(sub.inp_board_filter, opts);
						}.bind(this));
						this.bind('blur-board-filter', function() {
							if(sub.inp_board_filter) sub.inp_board_filter.blur();
						});
						this.with_bind(sub, 'close', this.close.bind(this));
						return sub;
					}.bind(this));
				});

		}.bind(this));

		this.with_bind(turtl.events, 'sidebar:toggle', this.toggle.bind(this));
		this.with_bind(turtl.events, 'app:load:profile-loaded', this.render.bind(this));

		var hammer = new Hammer.Manager(this.el, {domEvents: true, touchAction: 'pan-y'});
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

		this.with_bind(context, 'esc', this.close.bind(this));

		// close when switching pages, UNLESS we specifically ask not to
		this.with_bind(turtl.controllers.pages, 'prerelease', function() {
			if(!this.skip_close_on_next_route) this.close();
			this.skip_close_on_next_route = false;
		}.bind(this), 'pages:close-on-page');
	},

	render: function() {
		if(!turtl.profile) {
			log.warn('SidebarController::render() -- missing `turtl.profile`');
			return;
		}
		var current_space = turtl.profile.current_space();
		if(!current_space) {
			log.warn('SidebarController::render() -- missing `turtl.profile.current_space()`');
			return;
		}
		var cur_space = current_space.toJSON();
		cur_space.color = current_space.get_color();
		var cur_space_id = current_space.id();
		var cur_board_id = turtl.param_router.get().board_id;
		var in_all_notes = turtl.router.cur_path().match(/\/spaces\/[^\/]+\/notes/);
		return this.html(view.render('sidebar/index', {
			state: this.viewstate,
			cur_space: cur_space,
			in_all_notes: in_all_notes,
			cur_board_id: cur_board_id,
			can_add_boards: this.viewstate.edit_icons && current_space.can_i(Permissions.permissions.add_board),
			can_edit_boards: this.viewstate.edit_icons && current_space.can_i(Permissions.permissions.edit_board),
			open: this.is_open,
			space_state: this.space_state,
			last_sync: (turtl.sync || {}).last_sync,
			polling: (turtl.sync || {})._polling,
			space_filter_active: !!this.space_filter,
			board_filter_active: !!this.board_filter,
		})).bind(this)
			.then(function() {
				this.fix_swiping();
			});
	},

	open: function() {
		this.is_open = true;
		document.body.addClass('settings');
		setTimeout(this.render.bind(this), 10);
		turtl.events.trigger('sidebar:open');
		this.trigger('focus-board-filter');
	},

	close: function() {
		this.close_spaces();
		if(!this.overlay) return;
		if(!this.is_open) return;
		this.is_open = false;
		this.overlay.setStyles({position: 'fixed'});
		this.render();
		setTimeout(function() {
			this.overlay.setStyles({position: ''});
		}.bind(this), 300);
		document.body.removeClass('settings');
		turtl.events.trigger('sidebar:close');
		var sub_spaces = this.sub('spaces');
		var sub_boards = this.sub('boards');
		sub_spaces && sub_spaces.clear_space_filter();
		sub_boards && sub_boards.clear_board_filter();
		var blurfn = function() {
			this.trigger('blur-space-filter');
			this.trigger('blur-board-filter');
		}.bind(this);
		setTimeout(blurfn);
		setTimeout(blurfn, 300);
	},

	toggle: function() {
		if(!turtl.user.logged_in) return;
		if(document.body.hasClass('settings')) {
			this.close();
		} else {
			this.open();
		}
	},

	open_spaces: function(e) {
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
				this.trigger('focus-space-filter', {delay: 100});
			});
	},

	close_spaces_del: function(e) {
		if(!this.el_spaces) return;
		if(!this.is_open && !this.space_state.open) return;
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
		// yes, do this in a loop. i'm sick of the filter not being focused
		for(var i = 0; i < 8; i++) {
			// timmy, when i tell you to do something, you do it.
			this.trigger('focus-board-filter', {delay: i * 2});
		}
		this.clear_board_filter();
		this.trigger('blur-space-filter');
	},

	close_spaces: function(e) {
		if(e) e.stop();
		this.close_spaces_del();
	},

	clear_space_filter: function(e) {
		var space_sub = this.sub('spaces');
		space_sub && space_sub.clear_space_filter();
	},

	clear_board_filter: function(e) {
		var board_sub = this.sub('boards');
		board_sub && board_sub.clear_board_filter();
	},

	fix_swiping: function() {
		// NOTE: for some reason, the swipe events don't propagate from the
		// .inner div unless we specifically add them by hand here.
		if(!this._swipe_hammers) this._swipe_hammers = [];
		if(this._swipe_hammers.length) {
			this._swipe_hammers.forEach(function(s) { s.destroy(); });
			this._swipe_hammers = [];
		}
		var make_hammer = function(el) {
			if(!el) return;
			var hammer = new Hammer.Manager(el, {touchAction: 'pan-y'});
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
		if(options.delay <= 0) {
			el.focus();
		} else if(options.delay === undefined) {
			setTimeout(function() { el.focus(); }, 100);
		} else {
			setTimeout(function() { el.focus(); }, options.delay);
		}
	},
});

