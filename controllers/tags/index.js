var TagsController = Composer.Controller.extend({
	elements: {
		'ul.tags': 'tag_list',
		'div.filters': 'filters',
		'input[name=search]': 'inp_search'
	},

	events: {
		'keyup input[name=search]': 'do_text_search',
		'focus input[name=search]': 'search_focus',
		'blur input[name=search]': 'search_blur',
		'click a[href=#clear-filters]': 'clear_filters'
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
		this.board.bind_relational('notes', ['add', 'remove', 'reset'], this.update_filters.bind(this), 'tags:listing:update_filters');

		turtl.keyboard.bind('f', function() { this.inp_search.focus(); }.bind(this), 'notes:shortcut:search_focus');
		turtl.keyboard.bind('x', this.clear_filters.bind(this), 'notes:shortcut:clear_filters');

		// track all changes to our sub-controllers
		this.setup_tracking(this.tags);
	},

	release: function()
	{
		if(this.tags)
		{
			this.board.unbind_relational('tags', ['change:filters', 'change:selected', 'change:excluded'], 'tags:listing:gray_disabled');
			this.tags.unbind('change:count', 'tags:listing:monitor_sort');
			this.board.unbind_relational('notes', ['add', 'remove', 'reset'], 'tags:listing:update_filters');
			this.tags.detach();
		}
		turtl.keyboard.unbind('x', 'notes:shortcut:clear_filters');
		turtl.keyboard.unbind('f', 'notes:shortcut:search_focus');
		this.parent.apply(this, arguments);
	},

	render: function()
	{
		var content = Template.render('tags/index', {});
		this.html(content);
		this.update_filters();
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
		var notes	=	turtl.controllers.pages.cur_controller.notes_controller.filter_list;
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
			var note_list	=	turtl.search.index_tags[tag.get('name')];
			var tag_enable	=	turtl.search.intersect(notes, note_list).length > 0;

			if(tag_enable != enabled)
			{
				tag.set({disabled: !tag_enable}, {silent: true});
				tag.trigger('gray');
			}
		});
		//console.log('gray time: ', performance.now() - start);
	},

	do_text_search: function(e)
	{
		var do_search	=	function()
		{
			// NOTE: kind of a hack...search box used to belong to notes controller
			// and instead of using a central filtering model, we just set the
			// search text into the notes controller manually and trigger a filter
			// change. not the best way to do it.
			var notes_controller			=	turtl.controllers.pages.cur_controller.notes_controller;
			notes_controller.search_text	=	this.inp_search.get('value');
			this.board.get('tags').trigger('change:filters');
		}.bind(this);

		if(e.key && e.key == 'esc')
		{
			this.inp_search.set('value', '');
			this.inp_search.focus();
			do_search();
			return;
		}

		if(!this.search_timer)
		{
			this.search_timer		=	new Timer(100);
			this.search_timer.end	=	do_search;
		}
		this.search_timer.start();
	},

	search_focus: function(e)
	{
		turtl.keyboard.detach(); // disable keyboard shortcuts while editing
	},

	search_blur: function(e)
	{
		turtl.keyboard.attach(); // re-enable shortcuts
	},

	clear_filters: function(e)
	{
		if(e) e.stop();

		// as noted above, it's stupid to have controllers holding search state.
		// don't worry, I'm aware. but this is a quick.dirty way to get things
		// moving
		var notes_controller	=	turtl.controllers.pages.cur_controller.notes_controller;
		notes_controller.search_text	=	'';

		this.inp_search.set('value', '');
		this.board.get('tags').each(function(t) {
			t.set({
				selected: false,
				excluded: false
			}, {silent: true});
		});
		this.board.set({filters: []});
		this.board.get('tags').trigger('reset');
		this.board.get('tags').trigger('change:filters');
	},

	update_filters: function()
	{
		var num_notes	=	this.board.get('notes').models().length;
		if(num_notes > 0) this.filters.setStyle('display', 'block');
		else this.filters.setStyle('display', 'none');
	}
}, TrackController);
