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

	timer: null,

	init: function()
	{
		this.profile = tagit.user.load_profile({
			project: this.current_project
		});
		var do_init = function() {
			this.render();
			this.projects_controller = new ProjectsController({
				el: this.projects,
				profile: this.profile
			});
			this.categories_controller = new CategoriesController({
				el: this.categories,
				profile: this.profile
			});
			this.tags_controller = new TagsController({
				el: this.tags,
				profile: this.profile
			});
			this.notes_controller = new NotesController({
				el: this.notes,
				profile: this.profile
			});

			tagit.controllers.pages.trigger('loaded');
		}.bind(this);

		this.profile.bind_relational('projects', ['reset', 'remove'], function() {
			this.soft_release();
			do_init();
		}.bind(this), 'dashboard:init_on_projects');
		this.profile.bind('change:current_project', function() {
			this.soft_release();
			var current = this.profile.get_current_project();
			if(this.project) current.load_notes();
			do_init();
		}.bind(this), 'dashboard:change_project');
		do_init();
		tagit.keyboard.bind('S-/', this.open_help.bind(this), 'dashboard:shortcut:open_help');

		// monitor sidebar size changes
		this.timer = new Timer(50);
		this.timer.end = this.resize_sidebar.bind(this);
		this.timer.start();
	},

	soft_release: function()
	{
		if(this.projects_controller) this.projects_controller.release();
		if(this.categories_controller) this.categories_controller.release();
		if(this.tags_controller) this.tags_controller.release();
		if(this.notes_controller) this.notes_controller.release();
	},

	release: function()
	{
		this.soft_release();
		this.profile.unbind_relational('projects', ['reset', 'remove'], 'dashboard:init_on_projects');
		this.profile.unbind('change:current_project', 'dashboard:change_project');
		tagit.keyboard.unbind('S-/', 'dashboard:shortcut:open_help');
		this.timer.end = null;
		this.timer = null;
		this.parent.apply(this, arguments);
	},

	render: function()
	{
		var content = Template.render('dashboard/index', {
		});
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
			console.log('top: ', sidepos.top);
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
		var sidepos = this.sidebar.getCoordinates();  // recalculate (sidebar pos may have changed)
		var wheight = window.getCoordinates().height;
		var mtop = sidepos.top;
		var height = wheight - mtop;
		if(this.sidebar.getStyle('position') != 'fixed')
		{
			height += scroll;
		}
		this.sidebar.setStyles({
			height: height - 5
		});
		this.timer.start();
	}
});

