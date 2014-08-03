var NotesController = TrackController.extend({
	elements: {
		'ul.note_list': 'note_list',
		'div.sort': 'sort_actions',
		'ul.list-type': 'display_actions'
	},

	events: {
		'click div.button.note.add': 'open_add_note',
		'click div.button.note.share': 'share_board',
		'click .sort a': 'change_sort',
		'click ul.list-type a': 'change_list_type'
	},

	board: null,
	filter_list: null,

	searchtxt: false,
	limit: 300,
	sort_order: null,
	masonry: null,
	masonry_timer: null,

	init: function()
	{
		if(!this.board) return false;

		this.render();

		var tags = this.board.get('tags');
		var notes = this.board.get('notes');
		var board_id = this.board.id();
		this.filter_list = new NotesFilter(this.board.get('notes'), {});

		// Main search event
		var run_search = function()
		{
			var start = performance.now();
			var get_tag_type = function(type)
			{
				return tags
					.filter(function(t) { return t.get(type); })
					.map(function(t) { return t.get('name'); });
			};
			var selected = get_tag_type('selected');
			var excluded = get_tag_type('excluded');
			var searchtxt = this.searchtxt;
			var limit = this.limit;
			var sort = this.sort_order || ['id', 'asc'];
			console.log('sort : ', sort);

			var search = {
				board_id: board_id,
				limit: limit,
				sort: sort[0] + '-' + sort[1]
			};

			if((searchtxt || '').trim()) search.search = searchtxt.trim();
			if(selected.length || excluded.length)
			{
				var tagsearch = selected.concat(excluded.map(function(e) { return '-'+e; }));
				search.tags = tagsearch;
			}

			var start = performance.now();

			// do the actual filtering
			this.render_to_fragment();
			notes.search(search, {
				success: function() {
					this.finish_fragment(this.note_list);
					log.debug('note filter time: ', performance.now() - start);
					this.setup_masonry();
				}.bind(this)
			});
		}.bind(this);

		this.with_bind(tags, ['search', 'change:filters', 'change:selected', 'change:excluded'], run_search);
		this.with_bind(notes, ['add', 'remove', 'reset', 'clear', 'misc'], function() {
			if(this.board.get('notes').models().length == 0)
			{
				this.display_actions.addClass('hidden');
				this.sort_actions.addClass('hidden');
			}
			else
			{
				this.display_actions.removeClass('hidden');
				this.sort_actions.removeClass('hidden');
			}
		}.bind(this));

		this.bind('set-limit', run_search);
		this.bind('sort-change', function(field, direction) {
			this.sort_order = [field, direction];
			run_search();
		}.bind(this));

		// track all changes to our sub-controllers
		this.setup_tracking(this.filter_list);

		this.with_bind(turtl.keyboard, 'a', this.open_add_note.bind(this));
		this.with_bind(turtl.keyboard, 'enter', this.sub_view_note.bind(this));
		this.with_bind(turtl.keyboard, 'e', this.sub_edit_note.bind(this));
		this.with_bind(turtl.keyboard, 'delete', this.sub_delete_note.bind(this));

		// masonry stuff
		this.with_bind(this.filter_list, ['reset', 'add', 'remove', 'change'], this.setup_masonry.bind(this));
		this.with_bind(notes, ['math-render'], this.setup_masonry.bind(this));
		this.note_list.addClass('list_masonry');
		this.setup_masonry();
	},

	release: function()
	{
		this.filter_list.detach();
		if(this.masonry) this.masonry.detach();
		if(this.masonry_timer) this.masonry_timer.stop();
		return this.parent.apply(this, arguments);
	},

	render: function()
	{
		var content = Template.render('notes/index', {
			display_type: this.board.get('display_type'),
			enable_share: !this.board.get('shared')
		});
		this.html(content);

		// make sure display type buttons show up
		(function() { this.board.get('notes').trigger('misc'); }).delay(10, this);
	},

	setup_masonry: function()
	{
		var do_masonry = function()
		{
			if(this.masonry)
			{
				this.masonry.detach();
				this.masonry = null;
			}
			this.masonry = this.note_list.masonry({
				//itemSelector: '> li.note:not(.hide)',
				singleMode: true,
				resizeable: true
			});
			var images = this.note_list.getElements('> li.note:not(.hide) > .gutter img');
			images.each(function(img) {
				if(img.complete || (img.naturalWidth && img.naturalWidth > 0)) return;
				img.onload = function() {
					img.onload = null;
					this.setup_masonry();
				}.bind(this);
			}.bind(this));
		}.bind(this);

		if(!this.masonry_timer)
		{
			this.masonry_timer = new Timer(5, 5);
			this.masonry_timer.end = do_masonry;
		}
		this.masonry_timer.start();
	},

	open_add_note: function(e)
	{
		if(e) e.stop();
		new NoteEditController({
			board: this.board
		});
	},

	share_board: function(e)
	{
		if(e) e.stop();
		if(!this.board) return;
		new BoardShareController({ board: this.board });
		if(turtl.user.get('personas').models().length == 0)
		{
			new PersonaEditController();
		}
	},

	get_selected_note_controller: function()
	{
		var note = this.filter_list.find(function(m) {
			return m.get('selected', false);
		});
		if(!note) return false;
		var con = this.sub_controller_index[note.id()];
		return con;
	},

	sub_view_note: function()
	{
		var con = this.get_selected_note_controller();
		if(!con) return false;
		con.view_note();
	},

	sub_edit_note: function()
	{
		if(modal.is_open) return false;
		var con = this.get_selected_note_controller();
		if(!con) return false;
		con.open_edit();
	},

	sub_move_note: function()
	{
		if(modal.is_open) return false;
		var con = this.get_selected_note_controller();
		if(!con) return false;
		con.open_move();
	},

	sub_delete_note: function()
	{
		if(modal.is_open) return false;
		var con = this.get_selected_note_controller();
		if(!con) return false;
		con.delete_note();
	},

	create_subcontroller: function(note)
	{
		return new NoteItemController({
			inject: this.fragment || this.note_list,
			board: this.board,
			model: note,
			display_type: this.board.get('display_type')
		});
	},

	change_sort: function(e)
	{
		if(!e) return false;
		e.stop();

		var a = next_tag_up('a', e.target);
		var sort = a.href.replace(/.*#note-sort-/, '');
		if(a.hasClass('sel'))
		{
			if(a.hasClass('asc'))
			{
				a.removeClass('asc').addClass('desc');
			}
			else
			{
				a.removeClass('desc').addClass('asc');
			}
		}
		else
		{
			$ES('.note-actions .sort a', this.el).each(function(atag) {
				atag.removeClass('sel').removeClass('asc').removeClass('desc');
			});

			// some things (like "mod") should be sorted DESC by default
			if(['mod'].indexOf(sort) > -1)
			{
				a.addClass('sel').addClass('desc');
			}
			else
			{
				a.addClass('sel').addClass('asc');
			}
		}
		var direction = a.className.match(/\basc\b/) ? 'asc' : 'desc';
		this.trigger('sort-change', sort, direction);
	}
});

