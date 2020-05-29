const NotesListController = Composer.ListController.extend({
	xdom: true,
	class_name: 'list-container',

	elements: {
		'ul': 'note_list',
		'p.paginate': 'pagination',
	},

	events: {
		'click .paginate a': 'paginate',
	},

	viewstate: {
		initial: true,
		empty: true,
		no_results: false,
		mode: 'masonry',
	},

	masonry: null,
	masonry_timer: null,

	// filled in from index controller
	search: {},
	total: 0,

	_last_search: [],

	init: function()
	{
		this.masonry_timer = new Timer(50);
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
			this.trigger.apply(this, ['search'].concat(to_arr(arguments)));
			this.viewstate.searching = true;
			this.render();
		}.bind(this));
		this.bind('search-reset', function() {
			this.viewstate.searching = false;
			this.render();
		}.bind(this));
		this.bind('release', function() { this.masonry_timer.unbind(); }.bind(this));

		this.bind_once('xdom:render', function() {
			// run an initial search
			this.do_search()
				.bind(this)
				.spread(function(searched_notes, _tags, _total) {
					var ids = searched_notes.map(function(n) { return n.id(); })

					// clear the "initial" state
					this.viewstate.initial = false;

					// curtail rendering duplicate result sets
					this._last_search = JSON.stringify(ids);

					this.bind('search', function(options) {
						options || (options = {});
						if(options.reset_pages) this.search.page = 1;
						this.do_search(Object.merge({notify: true}, options));
					}.bind(this));

					var notes = this.notes;
					notes.reset(searched_notes);

					var search_timer = new Timer(500);
					this.with_bind(search_timer, 'fired', this.trigger.bind(this, 'search'));
					this.with_bind(turtl.events, ['sync:update:note'], function() {
						search_timer.stop();
						this.trigger('search', {upsert: true});
					}.bind(this));
					this.track(notes, function(model, options) {
						options || (options = {});
						// since the search model only deals with IDs, here we pull
						// out the actual note model from the profile (which was
						// pre-loaded and decrypted)
						var note = notes.get(model.id());
						var con = new NotesItemController({
							inject: options.container,
							model: note,
							embed_notes: true,
						});
						// if the note re-renders, it possibly changed height and we
						// need to adjust the masonry
						con.bind('update', this.masonry_timer.reset.bind(this.masonry_timer));
						return con;
					}.bind(this), {
						container: function() { return this.note_list }.bind(this)
					});

					this.with_bind(turtl.search, ['reset'], this.render.bind(this, {}));
					this.bind('search-done', function(searched_notes, _tags, _total, options) {
						options || (options = {});

						// curtail rendering duplicate result sets
						var string_ids = JSON.stringify(searched_notes.map(function(n) { return n.id(); }));
						if(string_ids == this._last_search) return;
						this._last_search = string_ids;

						this.notes.reset(searched_notes, options);
						this.viewstate.no_results = this.notes.size() === 0;
						this.render();

						// always go back to the top after a search
						if(options.scroll_to_top) $E('#wrap').scrollTo(0, 0);
					}.bind(this));
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

		return turtl.search.search(this.search)
			.bind(this)
			.spread(function(res, tags, total) {
				var opts = Object.merge({}, options);
				return [res, tags, total, opts];
			})
			.tap(function(res) {
				if(options.notify) this.trigger.apply(this, ['search-done'].concat(res));
			})
			.catch(function(err) {
				turtl.events.trigger('ui-error', i18next.t('There was a problem searching notes'), err);
				log.error('notes: list: ', err, derr(err));
			});
	},

	update_view: function()
	{
		switch(this.viewstate.mode)
		{
			case 'masonry':
				this.masonry_timer.reset();
				break;
			default:
				this.masonry_timer.stop();
				if(this.masonry) this.masonry.destroy();
				this.masonry = null;
				break;
		}
	},

	update_masonry: function()
	{
		if(this.viewstate.mode != 'masonry') return;

		if(!this.masonry) {
			this.masonry = new Masonry(this.note_list, {
				itemSelector: '.note-list > .note.item',
				columnWidth: '.note-list > .note.item',
				percentPosition: true,
				transitionDuration: 0,
			});
			return;
		}
		this.masonry.reloadItems();
		this.masonry.layout();
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

