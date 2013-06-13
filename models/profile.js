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
		this.get_sync_time();
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
		return this.set({current_project: obj}, options);
	},

	sync: function(options)
	{
		options || (options = {});
		var sync_time = this.get('sync_time');
		tagit.api.post('/sync', {time: sync_time}, {
			success: function(sync) {
			}.bind(this),
			error: function(e) {
				barfr.barf('Error syncing user profile with server: '+ e);
				if(options.error) options.error(e);
			}.bind(this)
		});
	},

	get_sync_time: function()
	{
		tagit.api.get('/sync', {}, {
			success: function(time) {
				this.set({sync_time: time});
			}.bind(this),
			error: function(e) {
				barfr.barf('Error syncing user profile with server: '+ e);
			}.bind(this)
		});
	}
});

