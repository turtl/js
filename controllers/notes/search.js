var NotesSearchController = Composer.Controller.extend({
	class_name: 'search-filters',

	elements: {
		'.tag-container': 'tag_container',
		'ul.tags': 'el_tags',
		'ul.colors': 'el_colors',
		'input[name=text]': 'inp_text'
	},

	events: {
		'click .filter-sort a': 'sort',
		'click a[rel=all]': 'show_all_tags',
		'keyup input[name=text]': 'text_search',
		'click ul.tags li': 'toggle_tag',
		'click ul.colors li': 'toggle_color'
	},

	modal: null,
	tags: [],
	search: {},

	init: function()
	{
		var titlefn = function(num) { return 'Search notes ('+ num +')'; };

		this.tags = clone(this.tags);
		this.tags.sort(function(a, b) {
			var sort = b.count - a.count;
			if(sort != 0) return sort;
			return a.name.localeCompare(b.name);
		});

		this.modal = new TurtlModal({
			class_name: 'turtl-modal search',
			show_header: true,
			title: titlefn(turtl.search.size()),
			actions: [
				{name: 'reset', icon: 'clear'}
			]
		});
		this.render();

		var close = this.modal.close.bind(this.modal);
		this.modal.open(this.el);
		this.with_bind(this.modal, 'close', this.release.bind(this));
		this.bind(['cancel', 'close'], close);

		this.with_bind(this.modal, 'header:fire-action', function(action) {
			switch(action)
			{
				case 'reset':
					this.reset_search();
					break;
			}
		}.bind(this));
		this.with_bind(turtl.search, 'reset', function() {
			this.modal.set_title(titlefn(turtl.search.size()), turtl.last_url);
		}.bind(this));

		var last_tags = null;
		this.bind('update-available-tags', function(tags) {
			if(JSON.stringify(tags) == last_tags) return;
			last_tags = JSON.stringify(tags);
			this.render_tags({available_tags: tags});
		});
		this.with_bind(turtl.search, 'search-tags', this.trigger.bind(this, 'update-available-tags'));
	},

	render: function(options)
	{
		options || (options = {});

		var sort = this.search.sort || NOTE_DEFAULT_SORT;

		// !!!! NOTE: duped in con/note/edit/idx.js !!!!
		var colors = NOTE_COLORS;
		colors = colors.map(function(color, i) {
			var selected = (this.search.colors || []).contains(i.toString());
			return {name: color, selected: selected, id: i};
		}.bind(this));

		this.html(view.render('notes/search/index', {
			sort: sort[0],
			dir: sort[1],
			text: this.search.text,
			colors: colors
		}));

		this.render_tags(options);

		setTimeout(function() { this.inp_text.focus(); }.bind(this), 300);
	},

	render_tags: function(options)
	{
		options || (options = {});

		var available_tags = options.available_tags;
		var tags = this.tags;
		var selected = this.search.tags;
		var sel_idx = make_index(selected, null);
		var avail_idx = available_tags && make_index(available_tags, 'name');

		var show_all = this.show_all;
		var max_show = 30;

		tags.forEach(function(tag) {
			if(sel_idx[tag.name])
			{
				tag.selected = true;
			}
			else
			{
				tag.selected = false;
			}

			if(avail_idx)
			{
				tag.available = !!avail_idx[tag.name];
			}
			else
			{
				tag.available = true;
			}
		});

		var content = view.render('notes/search/tags', {
			tags: tags.slice(0, show_all ? undefined : max_show),
			show_show_all: (tags.length > max_show && !show_all),
		});
		this.tag_container.set('html', content);
	},

	reset_search: function(e)
	{
		if(e) e.stop();
		this.search.sort = NOTE_DEFAULT_SORT;
		this.search.text = '';
		this.search.tags = [];
		this.search.colors = [];
		this.trigger('do-search');
		this.render();
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
			sort[1] = dir == 'desc' ? 'asc' : 'desc';
		}
		else
		{
			sort = [clickfield, 'desc'];
		}
		this.search.sort = sort;
		this.render();
		this.trigger('do-search');
	},

	show_all_tags: function(e)
	{
		if(e) e.stop();
		this.show_all = true;
		this.render();
	},

	text_search: function(e)
	{
		if(e) e.stop();
		var text = this.inp_text.get('value');
		this.search.text = text;
		this.trigger('do-search');
	},

	toggle_tag: function(e)
	{
		if(e) e.stop();
		var li = Composer.find_parent('li', e.target);
		if(!li) return;
		var name = li.getElement('span').get('html').clean();
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
	}
});

