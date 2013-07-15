var ProjectsController = Composer.Controller.extend({
	elements: {
		'.project-list select': 'selector'
	},

	events: {
		'click a.add': 'add_project',
		'click a.manage': 'manage_projects',
		'change .project-list select': 'change_project'
	},

	profile: null,

	init: function()
	{
		this.render();
		this.profile.bind_relational('projects', ['add', 'remove', 'reset', 'change:title'], this.render.bind(this), 'projects:change');
		this.profile.bind('change:current_project', this.render.bind(this), 'projects:track_current');
		tagit.keyboard.bind('x', this.clear_filters.bind(this), 'projects:shortcut:clear_filters');
		tagit.keyboard.bind('p', this.add_project.bind(this), 'projects:shortcut:add_project');
	},

	release: function()
	{
		this.profile.unbind_relational('projects', ['add', 'remove', 'reset', 'change:title'], 'projects:change');
		this.profile.unbind('change:current_project', 'projects:track_current');
		tagit.keyboard.unbind('x', 'projects:shortcut:clear_filters');
		tagit.keyboard.unbind('p', 'projects:shortcut:add_project');
		this.parent.apply(this, arguments);
	},

	render: function()
	{
		var current = this.profile.get_current_project();
		if(current) current = current.get('id');
		var content = Template.render('projects/list', {
			projects: toJSON(this.profile.get('projects')),
			current: current
		});
		this.html(content);
	},

	add_project: function(e)
	{
		if(e) e.stop();
		new ProjectEditController({
			profile: this.profile
		});
	},

	manage_projects: function(e)
	{
		if(e) e.stop();
		new ProjectManageController({
			collection: this.profile.get('projects')
		});
	},

	/*
	edit_project: function(e)
	{
		if(e) e.stop();
		var current = this.profile.get_current_project();
		new ProjectEditController({
			profile: this.profile,
			project: current
		});
	},

	delete_project: function(e)
	{
		if(e) e.stop();
		if(!confirm('Really delete this project, and all of its notes PERMANENTLY?? This cannot be undone!!')) return false;
		var current = this.profile.get_current_project();

		tagit.loading(true);
		current.destroy({
			success: function() {
				tagit.loading(false);

				var next = this.profile.get('projects').first() || false;
				this.profile.set_current_project(next);
			}.bind(this),
			error: function() {
				tagit.loading(false);
			}
		});
	},
	*/

	change_project: function(e)
	{
		var project_id = this.selector.value;
		var project = this.profile.get('projects').find_by_id(project_id);
		if(project) this.profile.set_current_project(project);
	},

	clear_filters: function()
	{
		var current = this.profile.get_current_project();
		current.get('tags').each(function(t) {
			t.set({
				selected: false,
				excluded: false
			}, {silent: true});
		});
		current.set({filters: []});
		current.get('tags').trigger('reset');
		current.get('tags').trigger('change:selected');
	}
});

