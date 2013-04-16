var DashboardController = Composer.Controller.extend({
	inject: tagit.main_container_selector,

	elements: {
		'.projects': 'projects',
		'.categories': 'categories',
		'.tags': 'tags',
		'.posts': 'posts'
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
			this.profile.set({ current_project: this.current_project });

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
			this.posts_controller = new PostsController({
				el: this.posts,
				profile: this.profile
			});

			tagit.controllers.pages.trigger('loaded');
		}.bind(this);

		this.profile.bind('change:projects', function() {
			this.profile.unbind('change:projects', 'dashboard:init_on_projects');
			do_init();
		}.bind(this), 'dashboard:init_on_projects');
		do_init();
	},

	release: function()
	{
		this.profile.unbind('change:current_project', 'dashboard:reinit_on_proj_change');
		this.projects_controller.release();
		this.categories_controller.release();
		this.tags_controller.release();
		this.parent.apply(this, arguments);
	},

	render: function()
	{
		var content = Template.render('dashboard/index', {
		});
		this.html(content);
	}
});

