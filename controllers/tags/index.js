var TagsController = TrackController.extend({
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

		this.tags = new TagsFilter(this.board.get('tags'), {
			sort_event: true,
			refresh_on_change: false
		});
		this.with_bind(this.tags, 'change:count', function() {
			this.tags.sort();
		}.bind(this));
		this.with_bind(this.board.get('notes'), ['add', 'remove', 'reset'], this.update_filters.bind(this));

		this.with_bind(turtl.keyboard, '/', function() { this.inp_search.focus(); }.bind(this));
		this.with_bind(turtl.keyboard, 'x', this.clear_filters.bind(this));

		// track all changes to our sub-controllers
		this.setup_tracking(this.tags);
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

	do_text_search: function(e)
	{
		var do_search = function()
		{
			// NOTE: kind of a hack...search box used to belong to notes controller
			// and instead of using a central filtering model, we just set the
			// search text into the notes controller manually and trigger a filter
			// change. not the best way to do it.
			var notes_controller = turtl.controllers.pages.cur_controller.get_subcontroller('notes');
			notes_controller.searchtxt = this.inp_search.get('value');
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
			this.search_timer = new Timer(250);
			this.search_timer.end = do_search;
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
		var notes_controller = turtl.controllers.pages.cur_controller.get_subcontroller('notes');
		notes_controller.searchtxt = '';

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
		if(!this.filters) return false;

		var num_notes = this.board.get('notes').models().length;
		//if(num_notes > 0) this.filters.setStyle('display', 'block');
		//else this.filters.setStyle('display', 'none');
	}
});
