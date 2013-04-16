var Project = Composer.RelationalModel.extend({
	relations: {
		tags: {
			type: Composer.HasMany,
			collection: 'Tags'
		},
		categories: {
			type: Composer.HasMany,
			collection: 'Categories'
		},
		notes: {
			type: Composer.HasMany,
			collection: 'Notes'
		}
	},

	public_fields: [
		'id',
		'user_id',
		'body',
		'sort'
	],

	defaults: {
		title: 'My Project'
	},

	set: function()
	{
		console.log('proj set: ', arguments);
		return this.parent.apply(this, arguments);
	},

	init: function()
	{
		// make tags auto-update from notes
		this.get('notes').bind('all', function() {
			var tags = this.get('tags');
			if(tags.refresh_from_notes(this.get('notes')))
			{
				tags.trigger('update');
			}
		}.bind(this), 'project:sync:tags');

		// make category tags auto-update when tags do
		this.get('tags').bind('update', function() {
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
				this.set({notes: notes});
				if(options.success) options.success(notes);
			}.bind(this),
			error: function(e) {
				barfr.barf('There was an error loading your notes.');
				if(options.error) options.error(e);
			}
		});
	}
}, Protected);

var Projects = Composer.Collection.extend({
	model: Project,

	load_projects: function(options)
	{
		options || (options = {});
		tagit.api.get('/projects/user/'+tagit.user.id(), {}, {
			success: function(projects) {
				console.log('data: ', projects);
				console.log('proj mod: ', new Project(projects[0]));
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
