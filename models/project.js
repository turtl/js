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
		posts: {
			type: Composer.HasMany,
			collection: 'Posts'
		}
	},

	defaults: {
		name: 'My Project'
	},

	init: function()
	{
		// make tags auto-update from posts
		this.get('posts').bind('all', function() {
			var tags = this.get('tags');
			if(tags.refresh_from_posts(this.get('posts')))
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
	}
});

var Projects = Composer.Collection.extend({
	model: Project,

	get_project: function(project_name)
	{
		return this.find(function(p) { return p.get('name') == project_name; });
	}
});
