var Profile = Composer.RelationalModel.extend({
	relations: {
		projects: {
			type: Composer.HasMany,
			collection: 'Projects',
			forward_events: true
		}
	},

	init: function()
	{
	},

	load: function(options)
	{
		options || (options = {});
		this.clear({silent: true});
		var projects = this.get('projects');
		projects.load_projects({
			success: function(data) {
				var project = null;
				if(options.project)
				{
					project = this.get('projects').find(function(p) {
						return p.get('title') == options.project.clean();
					});
				}
				if(!project) project = this.get('projects').first();
				if(!project) return;
				this.set_current_project(project);
				if(options.success) options.success();
			}.bind(this)
		});
	},

	get_current_project: function()
	{
		return this.get('current_project', false);
	},

	set_current_project: function(obj, options)
	{
		options || (options = {});
		var cur = this.get_current_project();
		//if(cur && cur.destroy_submodels) cur.destroy_submodels();
		return this.set({current_project: obj}, options);
	}
});

