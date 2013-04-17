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
		var projects = new Projects();
		projects.load_projects({
			success: function(data) {
				this.set({projects: data});
				var project = null;
				if(options.project)
				{
					project = this.get('projects').find(function(p) {
						return p.name == options.project;
					});
				}
				if(!project) project = this.get('projects').first();
				if(!project) return;
				this.set_current_project(project);
				project.load_notes({
					success: function(notes) {
						if(options.success) options.success();
					}.bind(this)
				});
			}.bind(this)
		});
	},

	get_current_project: function()
	{
		return this.get('current_project', false);
	},

	set_current_project: function(obj)
	{
		return this.set({current_project: obj});
	}
});

