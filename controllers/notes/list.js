var NotesListController = Composer.ListController.extend({
	elements: {
		'ul': 'note_list'
	},

	search: {
		text: '',
		boards: [],
		tags: [],
		sort: ['id', 'asc'],
		page: 1,
		per_page: 100
	},

	init: function()
	{
		this.render({initial: true});
		var renderopts = {empty: true};
		this.bind('list:empty', this.render.bind(this, renderopts));
		this.bind('list:notempty', this.render.bind(this));

		// run an initial search
		this.do_search().bind(this)
			.then(function() {
				this.bind('search', function() {
					this.do_search().then(this.trigger.bind(this, 'search-done'));
				});

				var notes = turtl.profile.get('notes');
				this.track(turtl.search, function(model, options) {
					// since the search model only deals with IDs, here we pull
					// out the actual note model from the profile (which was
					// pre-loaded and decrypted)
					var note = notes.find_by_id(model.id());
					return new NotesItemController({
						inject: this.note_list,
						model: note
					});
				}.bind(this), {bind_reset: true});

				this.bind('search-done', function(ids) {
					// let render know what's going on
					if(ids.length == 0) { renderopts.no_results = true; }
					else { delete renderopts.no_results; }

					// ok, all the notes we found are deserialized and loaded
					// into mem, so we trigger a reset and the tracker will pick
					// up on it and re-display the notes
					turtl.search.trigger('reset');
				});
			});
	},

	render: function(options)
	{
		options || (options = {});
		this.html(view.render('notes/list', {
			initial: options.initial,
			empty: options.no_results ? false : options.empty,
			no_results: options.no_results
		}));
	},

	do_search: function()
	{
		return turtl.search.search(this.search, {silent: true})
			.tap(function(ids) {
				return turtl.profile.get('notes').load_and_deserialize(ids, {silent: true});
			});
	}
});

