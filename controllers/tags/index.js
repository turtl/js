var TagsController = Composer.Controller.extend({
	elements: {
		'ul.tags': 'tag_list'
	},

	events: {
	},

	board: null,
	tags: null,

	init: function()
	{
		if(!this.board) return false;

		this.render();

		this.tags	=	new TagsFilter(this.board.get('tags'), {
			sort_event: true,
			refresh_on_change: false
		});
		this.tags.bind('change:count', function() {
			this.tags.sort();
		}.bind(this), 'tags:listing:monitor_sort');

		// track all changes to our sub-controllers
		this.setup_tracking(this.tags);

		this.tags.bind(['change:selected', 'change:excluded'], this.gray_tags.bind(this), 'tags:listing:gray_disabled');
	},

	release: function()
	{
		if(this.tags)
		{
			this.tags.unbind(['change:selected', 'change:excluded'], 'tags:listing:gray_disabled');
			this.tags.unbind('change:count', 'tags:listing:monitor_sort');
			this.tags.detach();
		}
		this.parent.apply(this, arguments);
	},

	render: function()
	{
		var content = Template.render('tags/index', {});
		this.html(content);
	},

	create_subcontroller: function(tag)
	{
		return new TagItemController({
			inject: this.tag_list,
			model: tag
		});
	},

	gray_tags: function()
	{
		//var start		=	performance.now();
		// heh. maybe pass in controller?
		var notes	=	tagit.controllers.pages.cur_controller.notes_controller.filter_list;
		if(!notes) return;

		notes		=	notes.models();
		var tags	=	this.tags.models();
		var change	=	[];
		for(var x in tags)
		{
			var tag = tags[x];
			if(!tag.get) continue;
			var enabled = !tag.get('disabled', false);
			var set_enable = -1;
			for(var y in notes)
			{
				var note = notes[y];
				if(note.has_tag && note.has_tag(tag.get('name')))
				{
					set_enable = true;
					break;
				}
				set_enable = false;
			}

			if(set_enable != enabled)
			{
				tag.set({disabled: !set_enable}, {silent: true});
				change.push(tag);
			}
		}
		change.each(function(tag) {
			tag.trigger('gray');
		});
		//console.log('filter time: ', performance.now() - start);
	}
}, TrackController);
