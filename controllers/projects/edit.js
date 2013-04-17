var ProjectEditController = Composer.Controller.extend({
	elements: {
		'input[type="text"]': 'inp_title'
	},

	events: {
		'submit form': 'edit_project'
	},

	project: null,
	profile: null,

	init: function()
	{
		this.render();
		modal.open(this.el);
		var close_fn = function() {
			this.release();
			modal.removeEvent('close', close_fn);
		}.bind(this);
		modal.addEvent('close', close_fn);
		this.inp_title.focus();
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
		var title = this.inp_title.get('value');
		if(this.project)
		{
			this.project.set({title: title});
		}
		else
		{
			this.project = new Project({ title: title });
			var projects = this.profile.get('projects');
			if(projects) projects.add(this.project);
			this.profile.set_current_project(this.project);
		}
		this.project.save();
		modal.close();
	}
});

