var DashboardController = Composer.Controller.extend({
	inject: turtl.main_container_selector,

	elements: {
		'.sidebar': 'sidebar',
		'.boards': 'boards',
		'.tags': 'tags',
		'.notes': 'notes',
		'.menu': 'menu'
	},

	// profile
	profile: null,

	current_board: null,

	sidebar_timer: null,

	init: function()
	{
		this.render();

		this.profile = turtl.profile;

		var do_load = function() {
			var current = this.profile.get_current_board();

			this.track_subcontroller('tags', function() {
				return new TagsController({
					inject: this.tags,
					board: current
				});
			}.bind(this));
			this.track_subcontroller('notes', function() {
				return new NotesController({
					inject: this.notes,
					board: current
				});
			}.bind(this));

			turtl.controllers.pages.trigger('loaded');
		}.bind(this);

		turtl.loading(true);
		var has_load = false;

		this.with_bind(this.profile, ['board-loaded', 'change:current_board'], do_load);

		this.with_bind(turtl.profile.get('boards'), 'remove', function() {
			if(this.profile.get('boards').models().length > 0) return;
			this.profile.trigger('change:current_board');
		}.bind(this), 'dashboard:boards:remove');

		this.track_subcontroller('boards', function() {
			var con = new BoardsController({
				el: this.boards,
				profile: this.profile
			});
			con.bind('change-board', function(board) {
				this.get_subcontroller('tags').clear_filters();
				this.profile.set_current_board(board);
			}.bind(this), 'dashboard:boards:change-board');
			return con;
		}.bind(this));

		this.with_bind(turtl.keyboard, 'S-/', this.open_help.bind(this));

		// monitor sidebar size changes
		this.sidebar_timer = new Timer(50);
		this.sidebar_timer.end = this.resize_sidebar.bind(this);
		this.sidebar_timer.start();

		var sidebar = $E('.sidebar-bg');
		if(sidebar) sidebar.setStyle('display', 'block');

		do_load();
	},

	release: function()
	{
		if(this.sidebar_timer)
		{
			this.sidebar_timer.stop();
			this.sidebar_timer.end = null;
		}

		// hide sidebar again
		var sidebar = $E('.sidebar-bg');
		if(sidebar) sidebar.setStyle('display', '');

		return this.parent.apply(this, arguments);
	},

	render: function()
	{
		var content = Template.render('dashboard/index');
		this.html(content);
	},

	open_help: function()
	{
		new HelpController();
	},

	resize_sidebar: function()
	{
		var scroll = window.getScroll().y;
		var sidepos = this.sidebar.getCoordinates();
		if(sidepos.top <= scroll && this.sidebar.getStyle('position') != 'fixed')
		{
			this._side_orig_top = sidepos.top;
			this.sidebar.setStyles({
				position: 'fixed',
				top: 10
			});
		}
		if(scroll <= this._side_orig_top)
		{
			this.sidebar.setStyles({
				position: '',
				top: ''
			});
		}

		var wheight = window.getCoordinates().height;
		var height = 500;
		if(this.sidebar.getStyle('position') == 'fixed')
		{
			height = wheight;
		}
		else
		{
			var sidepos = this.sidebar.getCoordinates();  // recalculate (sidebar pos may have changed)
			var mtop = sidepos.top;
			height = wheight - mtop;
			height += scroll;
		}
		this.sidebar.setStyles({
			height: height - 5
		});
		this.sidebar_timer.start();
	}
});

