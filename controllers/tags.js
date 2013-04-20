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
		this.tags.bind('change', this.gray_tags.bind(this), 'tags:listing:gray_disabled');
		this.render();
	},

	release: function()
	{
		if(this.tags)
		{
			this.tags.unbind(['add', 'remove', 'reset', 'change'], 'tags:listing:track_project');
			this.tags.unbind('change', 'tags:listing:gray_disabled');
		}
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
	},

	gray_tags: function()
	{
		// yuck. maybe pass in controller?
		var notes = tagit.controllers.pages.cur_controller.notes_controller.filter_list;
		if(!notes) return;
		notes = notes.models();
		var tags = this.tags.models();
		for(var x in tags)
		{
			var tag = tags[x];
			if(!tag.get) continue;
			tag.unset('disabled', {silent: true});
			var enabled = false;
			for(var y in notes)
			{
				var note = notes[y];
				if(note.has_tag && note.has_tag(tag.get('name')))
				{
					enabled = true;
					break;
				}
			}
			if(!enabled)
			{
				tag.set({disabled: true}, {silent: true});
			}
		}
		this.tags.refresh();
	}
});
