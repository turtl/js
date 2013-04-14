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
		research.api.post('save_profile', {profile: JSON.encode(data)}, {
			success: function() {
				if(options.success) options.success.apply(arguments, this);
			},
			error: function(e) {
				if(options.error) options.apply(arguments, this);
				else barfr.barf('There was an error saving your profile: '+ e.msg);
			}
		});
	},

	get_current_project: function()
	{
		return this.get('projects').find(function(p) {
			return p.get('name') == this.get('current_project');
		}.bind(this));
	}
});
