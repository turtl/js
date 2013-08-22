var DashboardController = Composer.Controller.extend({
	inject: turtl.main_container_selector,

	elements: {
		'.sidebar': 'sidebar',
		'.boards': 'boards',
		'.categories': 'categories',
		'.tags': 'tags',
		'.notes': 'notes',
		'.menu': 'menu'
	},

	// profile
	profile: null,

	current_board: null,

	boards_controller: null,
	categories_controller: null,
	tags_controller: null,

	sidebar_timer: null,

	init: function()
	{
		this.render();

		this.profile = turtl.profile;

		var do_load = function() {
			var current = this.profile.get_current_board();

			this.categories_controller = new CategoriesController({
				inject: this.categories,
				board: current
			});
			this.tags_controller = new TagsController({
				inject: this.tags,
				board: current
			});
			this.notes_controller = new NotesController({
				inject: this.notes,
				board: current
			});

			turtl.controllers.pages.trigger('loaded');
		}.bind(this);

		turtl.loading(true);
		var has_load = false;
		this.profile.bind('change:current_board', function() {
			this.soft_release();
			var current = this.profile.get_current_board();
			if(current && !has_load)
			{
				has_load = true;
				current.bind('notes_updated', function() {
					turtl.loading(false);
					current.unbind('notes_updated', 'board:loading:notes_updated');
				}, 'board:loading:notes_updated');
			}
			do_load();
		}.bind(this), 'dashboard:change_board');

		this.profile.bind_relational('boards', 'remove', function() {
			if(this.profile.get('boards').models().length > 0) return;
			this.profile.trigger('change:current_board');
		}.bind(this), 'dashboard:boards:remove');

		this.boards_controller = new BoardsController({
			el: this.boards,
			profile: this.profile
		});
		this.boards_controller.bind('change-board', function() {
			this.notes_controller.clear_filters();
		}.bind(this), 'dashboard:boards:change-board');

		turtl.keyboard.bind('S-/', this.open_help.bind(this), 'dashboard:shortcut:open_help');

		// monitor sidebar size changes
		this.sidebar_timer = new Timer(50);
		this.sidebar_timer.end = this.resize_sidebar.bind(this);
		this.sidebar_timer.start();

		this.profile.trigger('change:current_board');
	},

	soft_release: function()
	{
		if(this.categories_controller) this.categories_controller.release();
		if(this.tags_controller) this.tags_controller.release();
		if(this.notes_controller) this.notes_controller.release();
	},

	release: function()
	{
		this.soft_release();
		if(this.boards_controller) this.boards_controller.release();
		this.profile.unbind('change:current_board', 'dashboard:change_board');
		this.profile.unbind_relational('boards', 'remove', 'dashboard:boards:remove');
		turtl.keyboard.unbind('S-/', 'dashboard:shortcut:open_help');
		turtl.user.unbind('logout', 'dashboard:logout:clear_timer');
		if(this.sidebar_timer && this.sidebar_timer.end) this.sidebar_timer.end = null;
		this.parent.apply(this, arguments);
	},

	render: function()
	{
		var content = Template.render('dashboard/index');
		this.html(content);
	},

	open_help: function()
	{
		console.log('help!!');
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

