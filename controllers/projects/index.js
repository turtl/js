var ProjectsController = Composer.Controller.extend({
	elements: {
		'.project-list select': 'selector'
	},

	events: {
		'click a.add': 'add_project',
		'change .project-list select': 'change_project'
	},

	profile: null,

	init: function()
	{
		this.profile.bind_relational('projects', ['add', 'remove', 'reset', 'change'], this.render.bind(this), 'projects:change');
		this.render();
	},

	release: function()
	{
		this.profile.unbind_relational('projects', ['add', 'remove', 'reset', 'change'], 'projects:change');
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

	change_project: function(e)
	{
		var project_id = this.selector.value;
		var project = this.profile.get('projects').find_by_id(project_id);
		if(project) this.profile.set_current_project(project);
	}
});

