var DashboardController = Composer.Controller.extend({
	inject: tagit.main_container_selector,

	elements: {
		'.projects': 'projects',
		'.categories': 'categories',
		'.tags': 'tags',
		'.notes': 'notes'
	},

	// profile
	profile: null,

	current_project: null,

	projects_controller: null,
	categories_controller: null,
	tags_controller: null,

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
			this.profile.get_current_project().load_notes();
			do_init();
		}.bind(this), 'dashboard:change_project');
		do_init();
		tagit.keyboard.bind('S-/', this.open_help.bind(this), 'dashboard:shortcut:open_help');
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
	}
});

