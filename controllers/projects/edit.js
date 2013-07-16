var ProjectEditController = Composer.Controller.extend({
	elements: {
		'input[type="text"]': 'inp_title'
	},

	events: {
		'click a[href=#manage]': 'open_manager',
		'submit form': 'edit_project'
	},

	project: null,
	profile: null,

	// if true, opens management modal after successful update
	return_to_manage: false,

	init: function()
	{
		if(!this.project) this.project = new Project();
		this.render();
		modal.open(this.el);
		var close_fn = function() {
			this.release();
			modal.removeEvent('close', close_fn);
		}.bind(this);
		modal.addEvent('close', close_fn);
		this.inp_title.focus();
		tagit.keyboard.detach(); // disable keyboard shortcuts while editing
	},

	release: function()
	{
		tagit.keyboard.attach(); // re-enable shortcuts
		this.parent.apply(this, arguments);
	},

	render: function()
	{
		var content = Template.render('projects/edit', {
			return_to_manage: this.return_to_manage,
			project: toJSON(this.project)
		});
		this.html(content);
	},

	edit_project: function(e)
	{
		if(e) e.stop();
		var title = this.inp_title.get('value');
		var success = null;
		if(this.project.is_new())
		{
			this.project = new Project({title: title});
			this.project.generate_key();
			this.project.generate_subkeys();
			success = function() {
				var projects = this.profile.get('projects');
				if(projects) projects.add(this.project);
				if(!this.return_to_manage)
				{
					// only set the new project as current if we are NOT going
					// back to the manage modal.
					this.profile.set_current_project(this.project);
				}
			}.bind(this);
		}
		else
		{
			this.project.set({title: title});
		}
		tagit.loading(true);
		this.project.save({
			success: function() {
				tagit.loading(false);
				if(success) success();
				modal.close();

				if(this.return_to_manage)
				{
					this.open_manager();
				}
			}.bind(this),
			error: function(_, err) {
				tagit.loading(false);
				barfr.barf('There was a problem saving your project: '+ err);
			}
		});
	},

	open_manager: function(e)
	{
		if(e) e.stop();
		modal.close();

		// open management back up
		new ProjectManageController({
			collection: this.profile.get('projects')
		});
	}
});

