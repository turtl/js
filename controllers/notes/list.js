var NotesListController = Composer.ListController.extend({
	class_name: 'list-container',

	elements: {
		'ul': 'note_list'
	},

	search: {
		text: '',
		boards: [],
		tags: [],
		sort: ['id', 'desc'],
		page: 1,
		per_page: 100
	},
	board_id: null,

	view_mode: 'masonry',
	masonry: null,
	masonry_timer: null,

	init: function()
	{
		if(this.board_id) this.search.boards.push(this.board_id);

		this.masonry_timer = new Timer(10);
		this.with_bind(this.masonry_timer, 'fired', this.update_masonry.bind(this));

		this.render({initial: true});
		var renderopts = {empty: true};
		this.bind('list:empty', this.render.bind(this, renderopts));
		this.bind('list:notempty', this.render.bind(this));
		this.bind('release', function() { this.masonry_timer.unbind(); }.bind(this));

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
					var con = new NotesItemController({
						inject: this.note_list,
						model: note
					});
					// if the note re-renders, it possibly changed height and we
					// need to adjust the masonry
					con.bind('update', this.masonry_timer.reset.bind(this.masonry_timer));
					return con;
				}.bind(this), {bind_reset: true});

				this.with_bind(turtl.search, ['reset', 'add', 'remove'], this.update_view.bind(this));
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
		this.update_view();
	},

	do_search: function()
	{
		return turtl.search.search(this.search, {silent: true})
			.tap(function(ids) {
				return turtl.profile.get('notes').load_and_deserialize(ids, {silent: true});
			});
	},

	update_view: function()
	{
		this.note_list
			.removeClass('masonry')
			.removeClass('column')
			.removeClass('list')
			.addClass(this.view_mode);

		switch(this.view_mode)
		{
			case 'masonry':
				this.masonry_timer.reset();
				break;
			case 'column':
			case 'list':
				this.masonry_timer.stop();
				if(this.masonry) this.masonry.detach();
				this.masonry = null;
				break;
		}
	},

	update_masonry: function()
	{
		if(!this.view_mode.match(/^masonry/)) return;

		if(this.masonry) this.masonry.detach();
		this.masonry = null;

		var start = performance.now();
		this.masonry = this.note_list.masonry({
			singleMode: true,
			resizeable: true,
			itemSelector: '> li.note:not(.hide)'
		});
		var images = this.note_list.getElements('> li.note:not(.hide) > .gutter img');
		images.each(function(img) {
			if(img.complete || (img.naturalWidth && img.naturalWidth > 0)) return;
			img.onload = function() {
				img.onload = null;
				this.this.masonry_timer.reset();
			}.bind(this);
		}.bind(this));
		//console.log('masonry time: ', performance.now() - start);
	}
});

