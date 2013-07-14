var Profile = Composer.RelationalModel.extend({
	relations: {
		projects: {
			type: Composer.HasMany,
			collection: 'Projects',
			forward_events: true
		}
	},

	// stores ALL data for the profile, synced once during init from server.
	// also used to indicate whether or not initial data sync has occured yet
	profile_data: false,

	// tracks items to ignore when a sync occurs. this is useful for ignoring
	// things that the user just changed which can overwrite data with older
	// versions.
	sync_ignore: [],

	init: function()
	{
	},

	load_data: function(options)
	{
		tagit.api.get('/profiles/users/'+tagit.user.id(), {}, {
			success: function(profile) {
				this.profile_data = profile;
				tagit.user.set(profile.user);
				if(options.init) this.load(options);
				if(options.success) options.success(profile);
			}.bind(this),
			error: function(err) {
				barfr.barf('Error loading user profile: '+ err);
				if(options.error) options.error(e);
			}
		});
	},

	load: function(options)
	{
		options || (options = {});
		this.clear({silent: true});
		var projects = this.get('projects');
		var project_data = this.profile_data.projects;
		projects.load_projects(project_data, options);
		var project = null;
		this.loaded = true;
		if(options.project)
		{
			project = this.get('projects').find(function(p) {
				return p.id() == options.project.clean();
			});
		}
		if(!project) project = this.get('projects').first();
		if(!project) return;
		this.set_current_project(project);
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

	/**
	 * Keeps track of items to IGNORE when a sync happens
	 */
	track_sync_changes: function(id)
	{
		this.sync_ignore.push(id);
	},

	sync: function(options)
	{
		options || (options = {});
		if(!tagit.sync || !tagit.user.logged_in) return false;

		var sync_time = this.get('sync_time', 9999999);
		tagit.api.post('/sync', {time: sync_time}, {
			success: function(sync) {
				this.set({sync_time: sync.time});
				sync.notes.each(function(note_data) {
					// don't sync ignored items
					if(this.sync_ignore.contains(note_data.id)) return false;

					var project = false;
					var note = false;
					this.get('projects').each(function(p) {
						if(note) return;
						note = p.get('notes').find_by_id(note_data.id)
						if(note) project = p;
					});
					if(!project) return;

					if(note && note_data.deleted)
					{
						project.get('notes').remove(note);
						note.destroy({skip_sync: true});
						note.unbind();
					}
					else if(note)
					{
						var newproject = this.get('projects').find_by_id(note_data.project_id);
						note.set(note_data);

						// switch projects if moved
						if(newproject && project.id() != newproject.id())
						{
							project.get('notes').remove(note);
							newproject.get('notes').add(note);
						}
					}
					else if(!note_data.deleted)
					{
						project.get('notes').add(note_data);
					}
				}.bind(this));

				// reset ignore list
				this.sync_ignore	=	[];
			}.bind(this),
			error: function(e, xhr) {
				if(xhr.status == 0)
				{
					barfr.barf(
						'Error connecting with server. Your changes may not be saved.<br><br><a href="#" onclick="window.location.reload()">Try reloading</a>.',
						{message_persist: 'persist'}
					);
				}
				else
				{
					barfr.barf('Error syncing user profile with server: '+ e);
				}
				if(options.error) options.error(e);
			}.bind(this)
		});

		tagit.messages.sync();
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

