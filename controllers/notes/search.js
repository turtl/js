var NotesSearchController = Composer.Controller.extend({
	xdom: true,
	class_name: 'search-filters',

	elements: {
		'ul.tags': 'el_tags',
		'ul.colors': 'el_colors',
		'input[name=text]': 'inp_text'
	},

	events: {
		'click .filter-sort a': 'sort',
		'click a[rel=all]': 'show_all_tags',
		'input input[name=text]': 'text_search',
		'keydown input[name=text]': 'special_key',
		'click ul.tags li': 'toggle_tag',
		'click ul.colors li': 'toggle_color',
		'submit form': 'submit'
	},

	modal: null,
	tags: [],
	search: {},
	viewstate: {
		show_all_tags: false,
		available_tags: [],
	},

	show_max_tags: 30,

	init: function()
	{
		var titlefn = function(num) { return i18next.t('Search notes ({{num}})', {num: num}); };

		var update_initial_tags = function() {
			var search = clone(this.search || {});
			this.clear_search(search);
			turtl.search.find_tags(search)
				.bind(this)
				.then(function(tags) {
					this.tags = tags;
					this.tags.sort(function(a, b) {
						var sort = b.count - a.count;
						if(sort != 0) return sort;
						return a.name.localeCompare(b.name);
					});
					this.render();
				});
		}.bind(this);
		update_initial_tags();

		this.modal = new TurtlModal({
			class_name: 'turtl-modal search',
			skip_overlay: true,
			show_header: true,
			title: titlefn(turtl.search.total),
			actions: [
				{name: 'reset', icon: 'everything', title: i18next.t('Reset search')}
			]
		});
		this.render()
			.bind(this)
			.then(function() {
				setTimeout(function() { this.inp_text.select(); }.bind(this), 50);
			});

		var close = this.modal.close.bind(this.modal);
		this.modal.open(this.el);
		this.with_bind(this.modal, 'close', this.release.bind(this));
		this.bind(['cancel', 'close', 'release'], setTimeout.bind(window, close));

		document.body.addClass('search');
		this.bind('release', function() {
			document.body.removeClass('search');
		});

		this.with_bind(this.modal, 'header:fire-action', function(action) {
			switch(action) {
				case 'reset':
					this.reset_search();
					break;
			}
		}.bind(this));
		this.with_bind(turtl.search, 'search-done', function(_notes, _tags, total) {
			this.modal.set_title(titlefn(total), turtl.last_url);
		}.bind(this));

		var timer = new Timer(250);
		this.with_bind(timer, 'fired', this.trigger.bind(this, 'do-search'));
		this.bind('search-text', timer.reset.bind(timer));
		this.bind('release', function() {
			if(timer.timeout) this.trigger('do-search');
		});

		// grab the updated tag list when notes update
		this.with_bind(turtl.events, ['sync:update:note'], function(data) {
			// don't grab the tags unless the changed note is part of this
			// search
			if(this.search.space_id && search.space_id != data.space_id) {
				return;
			}
			if(this.search.board_id && search.board_id != data.board_id) {
				return;
			}
			update_initial_tags();
		}.bind(this));

		this.bind('update-available-tags', function(tags) {
			this.viewstate.available_tags = tags;
			this.render();
		});
		this.with_bind(turtl.search, 'search-tags', this.trigger.bind(this, 'update-available-tags'));
	},

	render: function(options)
	{
		options || (options = {});

		var sort = this.search.sort || NOTE_DEFAULT_SORT;

		var colors = NOTE_COLORS;
		colors = colors.map(function(color, i) {
			var selected = (this.search.colors || []).contains(i.toString());
			return {name: color, selected: selected, id: i};
		}.bind(this));

		var tags = this.process_tags(this.tags);

		return this.html(view.render('notes/search/index', {
			sort: sort[0],
			dir: sort[1],
			text: this.search.text,
			colors: colors,
			tags: tags,
			show_max_tags: this.show_max_tags,
			state: this.viewstate,
		}));
	},

	process_tags: function(tags) {
		tags = clone(tags);
		var available_tags = this.viewstate.available_tags || [];
		if(available_tags.length == 0 && this.search.tags.length == 0) {
			available_tags = tags;
		}
		var avail_idx = make_index(available_tags || [], 'name');
		var sel_idx = make_index(this.search.tags, null);
		return tags
			.map(function(tag) {
				tag.selected = !!sel_idx[tag.name];
				tag.available = !!avail_idx[tag.name];
				return tag;
			})
			.slice(0, this.viewstate.show_all_tags ? undefined : this.show_max_tags);
	},

	reset_search: function(e)
	{
		if(e) e.stop();
		this.trigger('search-reset');
		this.trigger('do-search');
		this.render();
	},

	clear_search: function(searchobj, options) {
		options || (options = {});
		searchobj.sort = NOTE_DEFAULT_SORT;
		searchobj.text = '';
		searchobj.tags = [];
		searchobj.colors = [];
		if(options.clear_page) searchobj.page = 1;
		return searchobj;
	},

	sort: function(e)
	{
		if(e) e.stop();
		var sort = this.search.sort || NOTE_DEFAULT_SORT;
		var field = sort[0];
		var dir = sort[1];
		var a = Composer.find_parent('a', e.target);
		var clickfield = a.get('rel');
		if(clickfield == field)
		{
			sort[1] = (dir == 'desc' ? 'asc' : 'desc');
		}
		else
		{
			sort = [clickfield, 'desc'];
		}
		this.search.sort = sort;
		this.render();
		this.trigger('do-search');
		this.trigger('search-mod');
	},

	show_all_tags: function(e)
	{
		if(e) e.stop();
		this.viewstate.show_all_tags = true;
	},

	text_search: function(e)
	{
		if(e) e.stop();
		var text = this.inp_text.get('value');
		this.search.text = text;
		this.trigger('search-text');
		this.trigger('search-mod');
	},

	// it plays a little melody
	special_key: function(e)
	{
		if(!e || e.key != 'esc') return;
		e.stop();
		this.trigger('close');
	},

	toggle_tag: function(e)
	{
		if(e) e.stop();
		var li = Composer.find_parent('li', e.target);
		if(!li) return;
		var name = decode_entities(li.getElement('span').get('html').clean());
		if(!this.search.tags) this.search.tags = [];

		if(this.search.tags.contains(name))
		{
			this.search.tags.erase(name);
		}
		else
		{
			this.search.tags.push(name);
		}

		this.render();
		this.trigger('do-search');
		this.trigger('search-mod');
	},

	toggle_color: function(e)
	{
		if(e) e.stop();
		var idx = Composer.find_parent('li', e.target).get('rel');
		if(!this.search.colors) this.search.colors = [];
		if(this.search.colors.contains(idx))
		{
			this.search.colors.erase(idx);
		}
		else
		{
			this.search.colors.push(idx);
		}

		this.el_colors.getElements('li').each(function(li) {
			var idx = li.get('rel');
			if(this.search.colors.contains(idx))
			{
				li.addClass('sel');
			}
			else
			{
				li.removeClass('sel');
			}
		}.bind(this));

		this.trigger('do-search');
		this.trigger('search-mod');
	},

	submit: function(e)
	{
		if(e) e.stop();
		this.trigger('close');
	}
});

