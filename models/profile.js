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

	save_profile: function(options)
	{
		options || (options = {});
		var data = this.toJSON();
		delete data.current_project;
		tagit.api.post('save_profile', {profile: JSON.encode(data)}, {
			success: function() {
				if(options.success) options.success.apply(arguments, this);
			},
			error: function(e) {
				if(options.error) options.apply(arguments, this);
				else barfr.barf('There was an error saving your profile: '+ e.msg);
			}
		});
	},

	load: function(options)
	{
		options || (options = {});
		this.clear({silent: true});
		var projects = new Projects();
		projects.load_projects({
			success: function(data) {
				var project = null;
				if(options.project)
				{
					project = projects.find(function(p) {
						return p.name == options.project;
					});
				}
				if(!project) project = projects.first();
				this.set({current_project: project});
				project.load_notes({
					success: function(notes) {
						if(options.success) options.success();
					}.bind(this)
				});
			}.bind(this),
			error: function(e) {
			}
		});
	},

	get_current_project: function()
	{
		return this.get('current_project');
	}
});
