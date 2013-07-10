var DashboardController = Composer.Controller.extend({
	inject: tagit.main_container_selector,

	elements: {
		'.sidebar': 'sidebar',
		'.projects': 'projects',
		'.categories': 'categories',
		'.tags': 'tags',
		'.notes': 'notes',
		'.menu': 'menu'
	},

	// profile
	profile: null,

	current_project: null,

	projects_controller: null,
	categories_controller: null,
	tags_controller: null,

	sidebar_timer: null,
	sync_timer: null,

	init: function()
	{
		this.render();

		tagit.controllers.HeaderBar.select_app(null, 'notes');

		this.profile = tagit.profile;

		var do_load = function() {
			var current = this.profile.get_current_project();

			this.categories_controller = new CategoriesController({
				inject: this.categories,
				project: current
			});
			this.tags_controller = new TagsController({
				inject: this.tags,
				project: current
			});
			this.notes_controller = new NotesController({
				inject: this.notes,
				project: current
			});

			tagit.controllers.pages.trigger('loaded');
			//if(current) current.get('notes').trigger('reset');
		}.bind(this);

		tagit.loading(true);
		var has_load = false;
		this.profile.bind('change:current_project', function() {
			this.soft_release();
			var current = this.profile.get_current_project();
			if(current && !has_load)
			{
				has_load = true;
				current.bind('notes_updated', function() {
					tagit.loading(false);
					current.unbind('notes_updated', 'project:loading:notes_updated');
				}, 'project:loading:notes_updated');
			}
			do_load();
		}.bind(this), 'dashboard:change_project');

		this.projects_controller = new ProjectsController({
			el: this.projects,
			profile: this.profile
		});

		tagit.keyboard.bind('S-/', this.open_help.bind(this), 'dashboard:shortcut:open_help');
		tagit.keyboard.bind('S-l', function() {
			tagit.route('/users/logout');
		}, 'dashboard:shortcut:logout');

		// monitor for sync changes
		this.sync_timer = new Timer(10000);
		this.sync_timer.end = this.sync.bind(this);
		this.sync_timer.start();

		// monitor sidebar size changes
		this.sidebar_timer = new Timer(50);
		this.sidebar_timer.end = this.resize_sidebar.bind(this);
		this.sidebar_timer.start();

		// kill everything on logout
		tagit.user.bind('logout', function() {
			this.release();
		}.bind(this), 'dashboard:logout:clear_timer');

		this.profile.load();
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
		if(this.projects_controller) this.projects_controller.release();
		this.profile.unbind('change:current_project', 'dashboard:change_project');
		tagit.keyboard.unbind('S-/', 'dashboard:shortcut:open_help');
		tagit.keyboard.unbind('S-l', 'dashboard:shortcut:logout');
		tagit.user.unbind('logout', 'dashboard:logout:clear_timer');
		if(this.sync_timer && this.sync_timer.end) this.sync_timer.end = null;
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

	sync: function()
	{
		this.profile.sync({
			error: function()
			{
				// show barfr error
			}
		});
		this.sync_timer.start();
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

