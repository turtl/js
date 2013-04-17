var ProjectsController = Composer.Controller.extend({
	elements: {
		'.project-list > ul': 'menu'
	},

	events: {
		'click a.add': 'add_project'
	},

	profile: null,

	init: function()
	{
		this.profile.get('projects').bind(['add', 'remove', 'reset', 'change'], this.render.bind(this), 'projects:change');
		this.render();
	},

	release: function()
	{
		this.profile.get('projects').unbind(['add', 'remove', 'reset', 'change'], 'projects:change');
		this.parent.apply(this, arguments);
	},

	render: function()
	{
		var current = this.profile.get_current_project();
		if(current) current = current.get('title');
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
	}
});

