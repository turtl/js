var NotesListController = Composer.ListController.extend({
	xdom: true,
	class_name: 'list-container',

	elements: {
		'ul': 'note_list',
		'p.paginate': 'pagination'
	},

	events: {
		'click .paginate a': 'paginate'
	},

	viewstate: {
		initial: true,
		empty: true,
		no_results: false,
		mode: 'masonry',
	},

	masonry: null,
	masonry_timer: null,

	// ALL tags that appear in thie board
	tags: null,

	// filled in from index controller
	search: {},
	total: 0,

	_last_search: [],

	init: function()
	{
		this.masonry_timer = new Timer(10);
		this.with_bind(this.masonry_timer, 'fired', this.update_masonry.bind(this));

		this.bind('list:empty', function() {
			this.viewstate.empty = true;
			this.render();
		}.bind(this));
		this.bind('list:notempty', function() {
			this.viewstate.empty = false;
			this.render();
		}.bind(this));
		this.bind('run-search', function() {
			this.trigger.apply(this, ['search'].concat(arguments));
			this.viewstate.searching = true;
			this.render();
		}.bind(this));
		this.bind('search-reset', function() {
			this.viewstate.searching = false;
			this.render();
		}.bind(this));
		this.bind('release', function() { this.masonry_timer.unbind(); }.bind(this));

		var resize_timer = new Timer(10);
		var resize_reset = function()
		{
			resize_timer.reset();
		}.bind(this);
		window.addEvent('resize', resize_reset);
		this.bind('release', function() {
			window.removeEvent('resize', resize_reset);
			resize_timer.unbind();
		});
		resize_timer.bind('fired', this.update_masonry.bind(this));

		this.bind_once('xdom:render', function() {
			// run an initial search
			this.do_search().bind(this)
				.spread(function(ids, tags) {
					// clear the "initial" state
					this.viewstate.initial = false;

					// curtail rendering duplicate result sets
					this._last_search = JSON.stringify(ids);

					this.tags = tags;
					this.bind('search', function(options) {
						options || (options = {});
						if(options.reset_pages) this.search.page = 1;
						this.do_search(Object.merge({notify: true}, options));
					}.bind(this));

					var notes = turtl.profile.get('notes');
					this.with_bind(notes, ['add', 'change', 'remove', 'reset', 'destroy'], function() {
						this.trigger('search');
					}.bind(this))
					this.track(turtl.search, function(model, options) {
						options || (options = {});
						var fragment = options.fragment;
						// since the search model only deals with IDs, here we pull
						// out the actual note model from the profile (which was
						// pre-loaded and decrypted)
						var note = notes.get(model.id());
						var con = new NotesItemController({
							inject: options.container,
							model: note
						});
						// if the note re-renders, it possibly changed height and we
						// need to adjust the masonry
						con.bind('update', this.masonry_timer.reset.bind(this.masonry_timer));
						return con;
					}.bind(this), {
						bind_reset: true,
						container: function() { return this.note_list }.bind(this)
					});

					this.with_bind(turtl.search, ['reset'], this.render.bind(this, {}));
					this.bind('search-done', function(ids, _tags, _total, options) {
						options || (options = {});

						// curtail rendering duplicate result sets
						var string_ids = JSON.stringify(ids);
						if(string_ids == this._last_search) return;
						this._last_search = string_ids;

						// let render know what's going on
						this.viewstate.no_results = ids.length === 0;

						// always go back to the top after a search
						if(options.scroll_to_top)
						{
							$E('#wrap').scrollTo(0, 0);
						}

						// ok, all the notes we found are deserialized and loaded
						// into mem, so we trigger a reset and the tracker will pick
						// up on it and re-display the notes
						turtl.search.trigger('reset');
					});
				});
		}.bind(this));
		this.render();
	},

	render: function()
	{
		var empty = this.viewstate.empty && !this.viewstate.searching;
		var no_results = this.viewstate.no_results && this.viewstate.searching;
		return this.html(view.render('notes/list', {
			state: this.viewstate,
			empty: empty,
			no_results: no_results,
			show_prev: this.search.page > 1,
			show_next: ((this.search.page * this.search.per_page) < turtl.search.total),
		})).bind(this)
			.then(this.update_view);
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
				if(options.notify) this.trigger.apply(this, ['search-done'].concat(res).concat([options]));
			});
	},

	update_view: function()
	{
		switch(this.viewstate.mode)
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
		if(!this.viewstate.mode.match(/^masonry/)) return;

		if(this.masonry) this.masonry.detach();
		var start = new Date().getTime();
		this.masonry = this.note_list.masonry({
			singleMode: true,
			resizeable: true,
			itemSelector: '> li.note'
		});
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

		return this.do_search({notify: true, scroll_to_top: true});
	}
});

