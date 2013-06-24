var Project = Composer.RelationalModel.extend({
	base_url: '/projects',

	relations: {
		tags: {
			type: Composer.HasMany,
			collection: 'Tags',
			forward_events: true
		},
		categories: {
			type: Composer.HasMany,
			collection: 'Categories',
			forward_events: true
		},
		notes: {
			type: Composer.HasMany,
			collection: 'Notes',
			forward_events: true
		}
	},

	public_fields: [
		'id',
		'user_id',
		'keys',
		'body',
		'sort'
	],

	private_fields: [
		'title'
	],

	defaults: {
	},

	_track_tags: true,

	init: function()
	{
		this.bind_relational('notes', 'add', function(note) {
			if(!this._track_tags) return false;
			this.get('tags').add_tags_from_note(note);
			this.get('tags').trigger('update');
		}.bind(this), 'project:model:notes:add');
		this.bind_relational('notes', 'remove', function(note) {
			if(!this._track_tags) return false;
			this.get('tags').remove_tags_from_note(note);
			this.get('tags').trigger('update');
		}.bind(this), 'project:model:notes:remove');
		this.bind_relational('notes', 'reset', function() {
			if(!this._track_tags) return false;
			this.get('tags').refresh_from_notes(this.get('notes'));
			this.get('tags').trigger('update');
		}.bind(this), 'project:model:notes:reset');
		this.bind_relational('notes', 'change:tags', function(note) {
			if(!this._track_tags) return false;
			this.get('tags').diff_tags_from_note(note);
			this.get('tags').trigger('update');
		}.bind(this), 'project:model:notes:change:tags');

		// make category tags auto-update when tags do
		this.bind_relational('tags', 'update', function() {
			if(!this._track_tags) return false;
			var cats = this.get('categories');
			var tags = this.get('tags');
			cats.each(function(c) {
				if(c.update_tags(tags))
				{
					c.trigger('update');
				}
			});
		}.bind(this));
	},

	track_tags: function(yesno)
	{
		this._track_tags = yesno;
	},

	load_notes: function(options)
	{
		options || (options = {});
		tagit.api.get('/projects/'+this.id()+'/notes', {}, {
			success: function(notes) {
				this.update_notes(notes, options);
			}.bind(this),
			error: function(e) {
				barfr.barf('There was an error loading your notes: '+ e);
				if(options.error) options.error(e);
			}
		});
	},

	update_notes: function(note_data, options)
	{
		options || (options = {});
		this.get('notes').clear();
		this.track_tags(false);
		(function() {
			this.get('notes').reset_async(note_data, {
				silent: true,
				complete: function() {
					this.get('notes').trigger('reset');
					this.track_tags(true);
					this.get('tags').refresh_from_notes(this.get('notes'), {silent: true});
					this.get('tags').trigger('reset');
					this.trigger('notes_updated');
					if(options.success) options.success(note_data);
				}.bind(this)
			});
		}).delay(0, this);
		/*
		this.set({notes: notes});
		this.track_tags(true);
		this.get('tags').refresh_from_notes(this.get('notes'), {silent: true});
		this.get('tags').trigger('reset');
		if(options.success) options.success(notes);
		*/
	},

	save: function(options)
	{
		options || (options = {});
		var url	=	this.id(true) ?
			'/projects/'+this.id() :
			'/projects/users/'+tagit.user.id();
		var fn	=	(this.id(true) ? tagit.api.put : tagit.api.post).bind(tagit.api);
		fn(url, {data: this.toJSON()}, {
			success: function(data) {
				this.set(data);
				if(options.success) options.success(data);
			}.bind(this),
			error: function(e) {
				barfr.barf('Error saving project: '+ e);
				if(options.error) options.error(e);
			}
		});
	},

	destroy_submodels: function()
	{
		var notes = this.get('notes');
		var tags = this.get('tags');
		var cats = this.get('categories');

		notes.each(function(n) { n.destroy({skip_sync: true}); n.unbind(); });
		tags.each(function(t) { t.destroy({skip_sync: true}); t.unbind(); });
		cats.each(function(c) { c.destroy({skip_sync: true}); c.unbind(); });
		notes.clear();
		tags.clear();
		cats.clear();
	},

	destroy: function(options)
	{
		options || (options = {});
		var success = options.success;
		options.success = function()
		{
			this.destroy_submodels();
			if(success) success.apply(this, arguments);
		}.bind(this);
		if(options.skip_sync)
		{
			options.success();
		}
		else
		{
			return this.parent.apply(this, [options]);
		}
	},

	get_selected_tags: function()
	{
		return this.get('tags').select(function(tag) {
			return this.is_tag_selected(tag.get('name'));
		}.bind(this));
	},

	get_excluded_tags: function()
	{
		return this.get('tags').select(function(tag) {
			return this.is_tag_excluded(tag.get('name'));
		}.bind(this));
	},

	get_tag_by_name: function(tagname)
	{
		return this.get('tags').find(function(tag) { return tag.get('name') == tagname; });
	},

	is_tag_selected: function(tagname)
	{
		var tag = this.get_tag_by_name(tagname);
		return tag ? tag.get('selected') : false;
	},

	is_tag_excluded: function(tagname)
	{
		var tag = this.get_tag_by_name(tagname);
		return tag ? tag.get('excluded') : false;
	}
}, Protected);

var Projects = Composer.Collection.extend({
	model: Project,

	clear: function(options)
	{
		options || (options = {});
		this.each(function(project) {
			project.clear(options);
		});
		return this.parent.apply(this, arguments);
	},

	load_projects: function(projects)
	{
		this.each(function(p) { p.destroy({skip_sync: true}); });
		this.clear();
		projects.each(function(pdata) {
			var notes = pdata.notes;
			delete pdata.notes;
			var project = new Project(pdata);
			this.add(project);
			project.update_notes(notes);
		}.bind(this));
		//this.reset(projects);
	},

	get_project: function(project_name)
	{
		return this.find(function(p) { return p.get('name') == project_name; });
	}
});
