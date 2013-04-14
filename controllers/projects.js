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
		var content = Template.render('projects/list', {
			projects: this.profile.get('projects').toJSON(),
			current: this.profile.get('current_project')
		});
		this.html(content);
		(function() {
			this.menu.removeClass('open');
		}).delay(10, this);
	},

	add_project: function(e)
	{
		if(e) e.stop();
		new ProjectAddController({
			profile: this.profile
		});
	}
});

var ProjectAddController = Composer.Controller.extend({
	elements: {
		'input[type="text"]': 'inp_name'
	},

	events: {
		'submit form': 'edit_project'
	},

	project: null,

	init: function()
	{
		this.render();
		modal.open(this.el);
		var close_fn = function() {
			this.release();
			modal.removeEvent('close', close_fn);
		}.bind(this);
		modal.addEvent('close', close_fn);
		this.inp_name.focus();
	},

	render: function()
	{
		var content = Template.render('projects/edit', {
			project: this.project
		});
		this.html(content);
	},

	edit_project: function(e)
	{
		if(e) e.stop();
		var name = this.inp_name.get('value');
		if(this.project)
		{
			this.project.set({name: name});
		}
		else
		{
			this.project = new Project({ name: name });
			var projects = this.profile.get('projects');
			if(projects) projects.add(this.project);
		}
		this.profile.save_profile();
		modal.close();
	}
});
