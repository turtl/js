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

		// make sure our tags are enabled
		this.board.get('tags').each(function(tag) {
			tag.unset('disabled', {silent: true});
		});

		this.tags	=	new TagsFilter(this.board.get('tags'), {
			sort_event: true,
			refresh_on_change: false
		});
		this.board.bind_relational('tags', ['change:filters', 'change:selected', 'change:excluded'], function() {
			this.gray_tags.delay(1, this);
		}.bind(this), 'tags:listing:gray_disabled');
		this.tags.bind('change:count', function() {
			this.tags.sort();
		}.bind(this), 'tags:listing:monitor_sort');

		// track all changes to our sub-controllers
		this.setup_tracking(this.tags);
	},

	release: function()
	{
		if(this.tags)
		{
			this.board.unbind_relational('tags', ['change:filters', 'change:selected', 'change:excluded'], 'tags:listing:gray_disabled');
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
		var start	=	performance.now();
		var notes	=	tagit.controllers.pages.cur_controller.notes_controller.filter_list;
		if(!notes) return;

		notes		=	notes
			.map(function(n) { return n.id(); })
			.sort(function(a, b) { return a.localeCompare(b); });
		var tags	=	this.tags.models();
		var change	=	[];

		// for each tag, intersect the search index with the currently enabled
		// notes. an empty list means the tag has no notes.
		tags.each(function(tag) {
			var enabled		=	!tag.get('disabled', false);
			var note_list	=	tagit.search.index_tags[tag.get('name')];
			var tag_enable	=	tagit.search.intersect(notes, note_list).length > 0;

			if(tag_enable != enabled)
			{
				tag.set({disabled: !tag_enable}, {silent: true});
				tag.trigger('gray');
			}
		});
		//console.log('gray time: ', performance.now() - start);
	}
}, TrackController);
