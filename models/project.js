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
		'body',
		'sort'
	],

	private_fields: [
		'title'
	],

	defaults: {
	},

	init: function()
	{
		// make tags auto-update from notes
		this.bind_relational('notes', 'all', function() {
			var tags = this.get('tags');
			if(tags.refresh_from_notes(this.get('notes')))
			{
				tags.trigger('update');
			}
		}.bind(this), 'project:sync:tags');

		// make category tags auto-update when tags do
		this.bind_relational('tags', 'update', function() {
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

	load_notes: function(options)
	{
		options || (options = {});
		tagit.api.get('/projects/'+this.id()+'/notes', {}, {
			success: function(notes) {
				this.get('notes').clear();
				this.set({notes: notes});
				if(options.success) options.success(notes);
			}.bind(this),
			error: function(e) {
				barfr.barf('There was an error loading your notes.');
				if(options.error) options.error(e);
			}
		});
	},

	save: function(options)
	{
		options || (options == {});
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
				barfr.barf('Error saving project. Try again!');
				if(options.error) options.error(e);
			}
		});
	},

	destroy: function(options)
	{
		options || (options = {});
		var success = options.success;
		options.success = function()
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
			if(success) success.apply(this, arguments);
		}.bind(this);
		return this.parent.apply(this, [options]);
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
	},

	select_tag: function(tagname)
	{
		var tag = this.get_tag_by_name(tagname);
		tag.set({selected: true});
	},

	exclude_tag: function(tagname)
	{
		var tag = this.get_tag_by_name(tagname);
		tag.set({excluded: true});
	},

	unselect_tag: function(tagname)
	{
		var tag = this.get_tag_by_name(tagname);
		tag.unset('selected');
	},

	unexclude_tag: function(tagname)
	{
		var tag = this.get_tag_by_name(tagname);
		tag.unset('excluded');
	}
}, Protected);

var Projects = Composer.Collection.extend({
	model: Project,

	load_projects: function(options)
	{
		options || (options = {});
		tagit.api.get('/projects/users/'+tagit.user.id(), {}, {
			success: function(projects) {
				this.reset(projects);
				if(options.success) options.success(projects);
			}.bind(this),
			error: function(e) {
				barfr.barf('There was an error loading your projects.');
				if(options.error) options.error(e);
			}
		});
	},

	get_project: function(project_name)
	{
		return this.find(function(p) { return p.get('name') == project_name; });
	}
});
