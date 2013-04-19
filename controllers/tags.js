var TagsController = Composer.Controller.extend({
	elements: {
	},

	events: {
		'click ul.tags li': 'select_tag'
	},

	project: null,
	tags: null,

	init: function()
	{
		this.project	=	this.profile.get_current_project();
		if(!this.project) return false;
		this.tags	=	new TagsFilter(this.project.get('tags'), {
			filter: function(m) { return true; },
			sortfn: function(a, b) {
				return b.get('count') - a.get('count');
			}
		});
		this.tags.bind(['add', 'remove', 'reset', 'change'], this.render.bind(this), 'tags:listing:track_project');
		this.render();
	},

	release: function()
	{
		if(this.tags) this.tags.unbind(['add', 'remove', 'reset', 'change'], 'tags:listing:track_project');
		this.parent.apply(this, arguments);
	},

	render: function()
	{
		var content = Template.render('tags/list', {
			tags: toJSON(this.tags)
		});
		this.html(content);
	},

	select_tag: function(e)
	{
		if(!e) return;
		e.stop()

		var li = next_tag_up('li', e.target);
		var tag = li.get('html').clean().toLowerCase();
		var exclude = e.control;

		if(this.project.is_tag_selected(tag))
		{
			this.project.unselect_tag(tag);
		}
		else if(this.project.is_tag_excluded(tag))
		{
			this.project.unexclude_tag(tag);
		}
		else
		{
			if(exclude)
			{
				this.project.exclude_tag(tag);
			}
			else
			{
				this.project.select_tag(tag);
			}
		}
	}
});
