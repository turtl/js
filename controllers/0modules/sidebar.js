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
	},

	is_open: false,
	boards: null,

	init: function()
	{
		this.with_bind(turtl.events, 'app:objects-loaded', function() {
			this.boards = new BoardsFilter(turtl.profile.get('boards'), {
				filter: function(b) {
					return b.get('space_id') == turtl.profile.current_space().id();
				}.bind(this),
			});
			this.with_bind(this.boards, ['add', 'remove', 'change'], this.render.bind(this));
			this.with_bind(turtl.profile.get('spaces'), ['add', 'remove', 'change'], this.render.bind(this));
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
			polling: (turtl.sync || {})._polling
		})).then(function() {
			// NOTE: for some reason, the swipe events don't propagate from the
			// .inner div unless we specifically add them by hand here.
			if(this._swipe_hammer) this._swipe_hammer.destroy();
			this._swipe_hammer = new Hammer.Manager(this.el_inner);
			this._swipe_hammer.add(new Hammer.Swipe());
		}.bind(this))
	},

	open: function()
	{
		this.is_open = true;
		document.body.addClass('settings');
		setTimeout(this.render.bind(this), 10);
		turtl.events.trigger('sidebar:open');
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
		this.render();
		setTimeout(function() {
			this.space_state.scroll = true;
			this.render();
		}.bind(this), 300);
	},

	close_spaces_del: function(e)
	{
		this.space_state.open = false;
		this.space_state.scroll = false;
		this.render();
		setTimeout(function() {
			this.space_state.zin = false;
			this.render();
		}.bind(this), 250);
	},

	close_spaces: function(e)
	{
		if(e) e.stop();
		this.close_spaces_del();
	},

	add_space: function(e)
	{
		if(e) e.stop();
		return new SpacesEditController();
	},

	edit_space: function(e)
	{
		if(e) e.stop();
		var li = Composer.find_parent('li', e.target);
		if(!li) return;
		var space_id = li.get('rel');
		if(!space_id) return;
		var space = turtl.profile.get('spaces').get(space_id);
		return new SpacesEditController({
			model: space,
		});
	},

	add_board: function(e)
	{
		if(e) e.stop();
		return new BoardsEditController({
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
		return new BoardsEditController({
			model: board,
		});
	},
});

