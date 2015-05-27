var NotesListController = Composer.ListController.extend({
	class_name: 'list-container',

	elements: {
		'ul': 'note_list',
		'p.paginate': 'pagination'
	},

	events: {
		'click .paginate a': 'paginate'
	},

	view_mode: 'masonry',
	masonry: null,
	masonry_timer: null,

	// ALL tags that appear in thie board
	tags: null,

	// filled in from index controller
	search: {},
	total: 0,

	init: function()
	{
		this.masonry_timer = new Timer(10);
		this.with_bind(this.masonry_timer, 'fired', this.update_masonry.bind(this));

		this.render({initial: true});
		var renderopts = {empty: true};
		this.bind('list:empty', this.render.bind(this, renderopts));
		this.bind('list:notempty', this.render.bind(this));
		this.bind('release', function() { this.masonry_timer.unbind(); }.bind(this));

		var resize_timer = new Timer(10);
		var resize_reset = function()
		{
			this.el.getElements('li.note').each(function(el) {
				el.setStyles({position: 'static'});
			});
			resize_timer.reset();
		}.bind(this);
		window.addEvent('resize', resize_reset);
		this.bind('release', function() {
			window.removeEvent('resize', resize_reset);
			resize_timer.unbind();
		});
		resize_timer.bind('fired', this.update_masonry.bind(this));

		// run an initial search
		this.do_search().bind(this)
			.spread(function(_, tags) {
				this.tags = tags;
				this.bind('search', function() {
					this.do_search({notify: true});
				});

				var notes = turtl.profile.get('notes');
				this.with_bind(notes, ['add', 'change', 'remove', 'reset', 'destroy'], function() {
					this.trigger('search');
				}.bind(this))
				this.track(turtl.search, function(model, options) {
					// since the search model only deals with IDs, here we pull
					// out the actual note model from the profile (which was
					// pre-loaded and decrypted)
					var note = notes.get(model.id());
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

					// always go back to the top after a search
					window.scrollTo(0, 0);

					// ok, all the notes we found are deserialized and loaded
					// into mem, so we trigger a reset and the tracker will pick
					// up on it and re-display the notes
					turtl.search.trigger('reset');
				});
				this.bind('search-done', this.update_pagination.bind(this));
				this.update_pagination();
			});

		/*
		var scroll_timer = new Timer(500);
		scroll_timer.bind('fired', this.infinite_scroll.bind(this));
		this._scroll_catcher = scroll_timer.reset.bind(scroll_timer);
		window.addEvent('scroll', this._scroll_catcher);
		this.bind('release', function() { window.removeEvent('scroll', this._scroll_catcher); }.bind(this));
		*/
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

	do_search: function(options)
	{
		options || (options = {});

		return turtl.search.search(this.search, {do_reset: true, upsert: options.upsert, silent: true})
			.bind(this)
			.tap(function(res) {
				return turtl.profile.get('notes').load_and_deserialize(res[0], {silent: true});
			})
			.tap(function(res) {
				if(options.notify) this.trigger.apply(this, ['search-done'].concat(arguments));
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
		var start = new Date().getTime();
		this.masonry = this.note_list.masonry({
			singleMode: true,
			resizeable: true,
			itemSelector: '> li.note'
		});
		var images = this.note_list.getElements('> li.note img');
		images.each(function(img) {
			if(img.complete || (img.naturalWidth && img.naturalWidth > 0)) return;
			img.onload = function() {
				img.onload = null;
				this.masonry_timer.reset();
			}.bind(this);
		}.bind(this));
		//console.log('masonry time: ', (new Date().getTime()) - start);
	},

	update_pagination: function()
	{
		this.pagination.set('html', '');
		if(this.search.page > 1)
		{
			var first = new Element('a')
				.set('href', '#first')
				.set('rel', 'first')
				.set('html', 'First')
				.inject(this.pagination);
			var prev = new Element('a')
				.set('href', '#prev')
				.set('rel', 'prev')
				.set('html', 'Prev')
				.inject(this.pagination);
		}
		if((this.search.page * this.search.per_page) < turtl.search.total)
		{
			var next = new Element('a')
				.set('href', '#next')
				.set('rel', 'next')
				.set('html', 'Next')
				.inject(this.pagination);
			var last = new Element('a')
				.set('href', '#last')
				.set('rel', 'last')
				.set('html', 'Last')
				.inject(this.pagination);
		}
	},

	paginate: function(e)
	{
		if(e) e.stop();
		var a = Composer.find_parent('a', e.target);
		if(!a) return;
		var rel = a.get('rel');
		var orig = this.search.page;
		if(rel == 'first' && this.search.page > 1)
		{
			this.search.page = 1;
		}
		if(rel == 'last')
		{
			this.search.page = Math.ceil(turtl.search.total / this.search.per_page);
		}
		if(rel == 'prev' && this.search.page > 1)
		{
			this.search.page--;
		}
		if(rel == 'next')
		{
			this.search.page++;
		}
		if(this.search.page == orig) return;

		return this.do_search({notify: true});
	}

	/*
	infinite_scroll: function()
	{
		var win_bottom = window.scrollY + window.innerHeight;
		var note_bottom = this.note_list.getCoordinates().bottom;
		if((win_bottom + 50) >= note_bottom)
		{
			this.search.page++;
			this.do_search({upsert: true, notify: true});
		}
	}
	*/
});

