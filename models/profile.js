var Profile = Composer.RelationalModel.extend({
	relations: {
		projects: {
			type: Composer.HasMany,
			collection: 'Projects',
			forward_events: true
		}
	},

	// stores whether or not all profile data has been downloaded
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
				this.profile_data = true;
				tagit.user.set(profile.user);
				if(options.init) this.load(profile, Object.merge({}, options, {
					complete: function() {
						if(options.success) options.success(profile);
					}.bind(this)
				}));
				else if(options.success) options.success(profile);
			}.bind(this),
			error: function(err) {
				barfr.barf('Error loading user profile: '+ err);
				if(options.error) options.error(e);
			}
		});
	},

	load: function(data, options)
	{
		options || (options = {});
		this.clear({silent: true});
		var projects = this.get('projects');
		var project_data = data.projects;
		projects.load_projects(project_data, Object.merge({}, options, {
			complete: function() {
				var project = null;
				this.loaded = true;
				if(options.project)
				{
					project = this.get('projects').find(function(p) {
						return p.id() == options.project.clean();
					});
				}
				if(!project) project = this.get('projects').first();
				if(project) this.set_current_project(project);
				if(options.complete) options.complete();
			}.bind(this)
		}));
	},

	get_current_project: function()
	{
		return this.get('current_project', false);
	},

	set_current_project: function(obj, options)
	{
		options || (options = {});
		if(typeOf(obj) == 'string')
		{
			obj	=	this.get('projects').find_by_id(obj);
		}
		if(!obj) return false;
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

					// check if the note is already in an existing project. if
					// so, save both the original project (and existing note)
					// for later
					var oldproject = false;
					var note = false;
					this.get('projects').each(function(p) {
						if(note) return;
						note = p.get('notes').find_by_id(note_data.id)
						if(note) oldproject = p;
					});

					// get the note's current project
					var newproject	=	this.get('projects').find_by_id(note_data.project_id);

					// note was deleted, remove it
					if(note && note_data.deleted)
					{
						oldproject.get('notes').remove(note);
						note.destroy({skip_sync: true});
						note.unbind();
					}
					// this is an existing note. update it, and be mindful of the
					// possibility of it moving projects
					else if(note && oldproject)
					{
						note.set(note_data);
						if(newproject && oldproject.id() != newproject.id())
						{
							// note switched project IDs. move it.
							oldproject.get('notes').remove(note);
							newproject.get('notes').add(note);
						}
					}
					// note isn't existing and isn't being deleted. add it!
					else if(!note_data.deleted)
					{
						newproject.get('notes').add(note_data);
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

