var SidebarController = Composer.Controller.extend({
	xdom: true,
	el: '#sidebar',

	elements: {
		'> .overlay': 'overlay',
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
		'click ul a': 'close',
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
		this.with_bind(turtl.controllers.pages, 'prerelease', this.close.bind(this));
		this.with_bind(turtl.events, 'sidebar:toggle', this.toggle.bind(this));
		this.with_bind(turtl.events, 'app:load:profile-loaded', this.render.bind(this));

		this.with_bind(turtl.user, 'login', function() {
			this.with_bind(turtl.profile.get('spaces'), ['change', 'add', 'remove', 'reset'], this.render.bind(this), 'sidebar:spaces:render');
		}, 'sidebar:login:render');

		var mc = new Hammer.Manager(this.el);
		mc.add(new Hammer.Press({time: 750}));
		mc.on('press', function(e) {
			var li = Composer.find_parent('li.space', e.target);
			if(!li) return;
			var settings = li.getElement('a.edit');
			if(!settings) return;
			settings.click();
		}, {time: 5000});
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
			last_sync: (turtl.sync || {}).last_sync,
			polling: (turtl.sync || {})._polling
		}));
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
		this.overlay.removeClass('show');
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
		this.el_spaces.addClass('open').addClass('zin');
	},

	close_spaces: function(e)
	{
		if(e) e.stop();
		if(!this.el_spaces) return;
		this.el_spaces.removeClass('open');
		setTimeout(function() {
			this.el_spaces.removeClass('zin');
		}.bind(this), 250);
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

