var NotesController = TrackController.extend({
	elements: {
		'ul.note_list': 'note_list',
		'ul.list-type': 'display_actions',
		'input[name=search]': 'inp_search'
	},

	events: {
		'click div.button.add.note': 'open_add_note',
		'click ul.list-type a': 'change_list_type',
		'keyup input[name=search]': 'do_text_search',
		'focus input[name=search]': 'search_focus',
		'blur input[name=search]': 'search_blur',
		'click a[href=#clear-filters]': 'clear_filters'
	},

	board: null,
	filter_list: null,
	note_item_controllers: [],

	masonry: null,
	masonry_timer: null,
	sort_notes: null,
	sorting: false,			// used to track whether sorting or not for edge scrolling
	last_search: false,		// used to store results of tag searches
	search_text: null,
	search_timer: null,

	init: function()
	{
		if(!this.board) return false;
		if(!this.board.get('display_type')) this.board.set({display_type: 'masonry'});

		this.render();

		var board_id	=	this.board.id();
		this.filter_list	=	new NotesFilter(this.board.get('notes'), {
			sort_event: true,
			refresh_on_change: false,
			filter: function(note)
			{
				if(!this.last_search) return true;
				if(this.last_search.contains(note.id())) return true;
				return false;
			}.bind(this),

			sortfn: function(a, b)
			{
				var sort_a	=	a.get('sort', 99999);
				var sort_b	=	b.get('sort', 99999);
				var sort	=	sort_a - sort_b;
				if(sort != 0)
				{
					return sort;
				}
				else
				{
					return a.id().localeCompare(b.id());
				}
			}
		});

		// we don't want to use forward_events:true on our filter collection
		// (its too resource intensive) BUTBUTBUT we can simulate it for the one
		// case we need it: sorting on sync
		this.board.bind_relational('notes', 'change:sort', function(note) {
			this.filter_list.trigger('change', note);
		}.bind(this), 'notes:sync:sort');

		// prevent unneccesary batch saving by pre-setting sort values
		this.filter_list.each(function(note, idx) {
			note.set({sort: idx}, {silent: true});
		});

		// Main search event
		this.board.bind_relational('tags', ['change:filters', 'change:selected', 'change:excluded'], function() {
			var start		=	performance.now();
			var selected	=	this.board.get_selected_tags().map(function(t) { return t.get('name'); });
			var excluded	=	this.board.get_excluded_tags().map(function(t) { return '!'+t.get('name'); });
			if(selected.length == 0 && excluded.length == 0 && (!this.search_text || this.search_text.clean().length == 0))
			{
				this.last_search	=	false;
			}
			else
			{
				this.last_search	=	turtl.search.search({
					text: this.search_text,
					boards: this.board.id(),
					tags: selected.append(excluded)
				});
			}
			//console.log('note search time: ', performance.now() - start);
			var start		=	performance.now();

			// do the actual filtering
			this.render_to_fragment();
			this.filter_list.refresh({diff_events: true, silent: 'reset'});
			this.finish_fragment(this.note_list);

			//console.log('note filter time: ', performance.now() - start);
			this.setup_masonry();
			this.setup_sort();
		}.bind(this), 'notes:listing:track_filters');

		this.board.bind('change:display_type', this.update_display_type.bind(this), 'notes:listing:display_type');
		this.filter_list.bind('reset', function() {
			this.update_display_type.delay(10, this);
		}.bind(this), 'notes:listing:display_type');
		this.filter_list.bind(['add', 'remove', 'change'], function() {
			this.setup_masonry();
			this.setup_sort();
		}.bind(this), 'notes:listing:update_masonry');

		this.board.get('notes').bind(['add', 'remove', 'reset', 'clear', 'misc'], function() {
			if(this.board.get('notes').models().length == 0)
			{
				this.display_actions.addClass('hidden');
			}
			else
			{
				this.display_actions.removeClass('hidden');
			}
		}.bind(this), 'notes:listing:show_display_buttons');

		// track all changes to our sub-controllers
		this.setup_tracking(this.filter_list);

		turtl.keyboard.bind('f', function() { this.inp_search.focus(); }.bind(this), 'notes:shortcut:search_focus');
		turtl.keyboard.bind('a', this.open_add_note.bind(this), 'notes:shortcut:add_note');
		turtl.keyboard.bind('enter', this.sub_view_note.bind(this), 'notes:shortcut:view_note');
		turtl.keyboard.bind('e', this.sub_edit_note.bind(this), 'notes:shortcut:edit_note');
		turtl.keyboard.bind('m', this.sub_move_note.bind(this), 'notes:shortcut:move_note');
		turtl.keyboard.bind('delete', this.sub_delete_note.bind(this), 'notes:shortcut:delete_note');
		turtl.keyboard.bind('x', this.clear_filters.bind(this), 'notes:shortcut:clear_filters');

		this.setup_masonry();
		this.setup_sort();
	},

	release: function()
	{
		if(this.board)
		{
			this.board.unbind_relational('notes', 'change:sort', 'notes:sync:sort');
			this.board.unbind_relational('tags', ['change:filters', 'change:selected', 'change:excluded'], 'notes:listing:track_filters');
			this.board.unbind('change:display_type', 'notes:listing:display_type');
			this.filter_list.unbind('reset', 'notes:listing:display_type');
			this.filter_list.unbind(['add', 'remove', 'change'], 'notes:listing:update_masonry');
			this.board.get('notes').unbind(['add', 'remove', 'reset', 'clear', 'misc'], 'notes:listing:show_display_buttons');
			this.filter_list.detach();
			this.release_subcontrollers();
		}
		turtl.keyboard.unbind('f', 'notes:shortcut:search_focus');
		turtl.keyboard.unbind('a', 'notes:shortcut:add_note')
		turtl.keyboard.unbind('enter', 'notes:shortcut:view_note');
		turtl.keyboard.unbind('e', 'notes:shortcut:edit_note');
		turtl.keyboard.unbind('m', 'notes:shortcut:move_note');
		turtl.keyboard.unbind('delete', 'notes:shortcut:delete_note');
		turtl.keyboard.unbind('x', 'notes:shortcut:clear_filters');
		if(this.masonry) this.masonry.detach();
		if(this.masonry_timer) this.masonry_timer.end = null;
		if(this.search_timer) this.search_timer.end = null;
		this.parent.apply(this, arguments);
	},

	render: function()
	{
		var content = Template.render('notes/index', {
			display_type: this.board.get('display_type')
		});
		this.html(content);

		// make sure display type buttons show up
		(function() { this.board.get('notes').trigger('misc'); }).delay(10, this);
	},

	open_add_note: function(e)
	{
		if(e) e.stop();
		new NoteEditController({
			board: this.board
		});
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
			inject: this.note_list,
			board: this.board,
			model: note,
			display_type: this.board.get('display_type')
		});
	},

	change_list_type: function(e)
	{
		if(!e) return;
		e.stop()

		var a = next_tag_up('a', e.target);
		var type = a.className.replace(/sel/g, '').clean().toLowerCase();
		if(type == '') return;
		this.board.set({display_type: type});
	},

	update_display_type: function()
	{
		var type = this.board.get('display_type', 'grid');
		this.note_list.className = this.note_list.className.replace(/list_[\w]+/g, '');
		this.note_list.addClass('list_'+type);
		$ES('li a', this.display_actions).each(function(a) {
			a.removeClass('sel');
		});
		$E('li a.'+this.board.get('display_type', 'grid')).addClass('sel');
		if(type == 'masonry')
		{
			this.setup_masonry();
		}
		else
		{
			if(this.masonry) this.masonry.detach()
			this.masonry = null;
			this.note_list.setStyles({position: '', height: ''});
			this.note_list.getElements('> li').each(function(li) {
				li.setStyles({
					position: '',
					left: '',
					top: ''
				});
			});
		}
		this.setup_sort();
	},

	setup_masonry: function()
	{
		var do_masonry	=	function()
		{
			if(this.board.get('display_type') != 'masonry') return;

			var start	=	performance.now();
			if(this.masonry)
			{
				this.masonry.detach();
				this.masonry	=	null;
			}
			this.masonry = this.note_list.masonry({
				singleMode: true,
				itemSelector: '> li.note:not(.hide)'
			});
			var images	=	this.note_list.getElements('> li.note:not(.hide) > .gutter img');
			images.each(function(img) {
				if(img.complete || (img.naturalWidth && img.naturalWidth > 0)) return;
				img.onload = function() {
					img.onload = null;
					this.setup_masonry();
				}.bind(this);
			}.bind(this));
			//console.log('masonry time: ', performance.now() - start);
		}.bind(this);

		if(!this.masonry_timer)
		{
			this.masonry_timer		=	new Timer(5, 5);
			this.masonry_timer.end	=	do_masonry;
		}
		this.masonry_timer.start();
	},

	edge_check: null,
	setup_sort: function()
	{
		if(!this.edge_check)
		{
			var mousey	=	null;
			this.edge_check	=	function(e)
			{
				if(!this.sorting) return false;
				if(e) mousey = e.page.y;
				if(!mousey) return false;

				var coords	=	$(window).getCoordinates();
				var scroll	=	$(window).getScrollTop();
				if(mousey > (scroll + coords.bottom) - 200)
				{
					window.scrollTo(null, scroll + 10);
				}
				else if(mousey < (scroll + 200))
				{
					window.scrollTo(null, scroll - 10);
				}
			}.bind(this);
		}
		if(this.sort_notes) this.sort_notes.detach();
		$(window).removeEvent('mousemove', this.edge_check);

		if(this.board.get('display_type') == 'masonry') return false;

		var note_being_sorted_el	=	null;
		this.sort_notes	=	new Sortables(this.note_list, {
			clone: true,
			opacity: .5,
			handle: '.actions a.sort span',
			onStart: function(note_el) {
				note_being_sorted_el	=	note_el;
				this.sorting	=	true;
			}.bind(this),
			onComplete: function() {
				this.sorting	=	false;
				var sorted_el	=	note_being_sorted_el;
				var prev_el		=	sorted_el.getPrevious();
				var next_el		=	sorted_el.getNext();
				var get_id		=	function(classname)
				{
					return classname.replace(/^.*id_([0-9a-f-]+).*?$/, '$1').clean();
				};

				note_being_sorted_el	=	null;

				var ids			=	this.note_list.getElements('> li.note').map(function(el) {
					return get_id(el.className);
				});

				var notes_collection	=	this.board.get('notes');

				var sorted_id	=	get_id(sorted_el.className);
				var prev_id		=	prev_el ? get_id(prev_el.className) : null;
				var next_id		=	next_el ? get_id(next_el.className) : null;
				var sorted		=	notes_collection.find_by_id(sorted_id);
				var prev		=	notes_collection.find_by_id(prev_id);
				var next		=	notes_collection.find_by_id(next_id);

				if(prev && next)
				{
					// manwich
					var sortval	=	prev.get('sort') + ((next.get('sort') - prev.get('sort')) / 2);
				}
				else if(next)
				{
					// sorted item was put at beginning
					var sortval	=	next.get('sort') - 1;
				}
				else if(prev)
				{
					// sorted item was put at end
					var sortval	=	prev.get('sort') + 1;
				}
				else
				{
					// sorted item is ...alone?
					return;
				}

				sorted.set({sort: sortval});
				sorted.save();

				/**
				 * Leaving this code since it's the only working example of
				 * batch note saving
				 *
				// save all note sorts as a batch
				notes_collection.start_batch_save();
				notes_collection.each(function(note) {
					if(!ids.contains(note.id())) return;
					var sortval	=	ids.indexOf(note.id()) + 1;
					console.log('sort: ', sortval, note.get('text'));
					note.set({sort: sortval});
				});
				notes_collection.finish_batch_save({
					shared: this.board.get('shared'),
					persona: this.board.get_shared_persona()
				});
				*/
			}.bind(this)
		});

		$(window).addEvent('mousemove', this.edge_check);
	},

	do_text_search: function(e)
	{
		var do_search	=	function()
		{
			this.search_text	=	this.inp_search.get('value');
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
		this.search_text	=	'';
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

	// -------------------------------------------------------------------------
	// NOTE:
	// the following two functions override the TrackController's versions
	// specifically for performance enhancements. Instead of removing the
	// sub controllers from the DOM, they are simply given the class "hide"
	// which saves performance, but achieves the same goal.

	add_subcontroller: function(model)
	{
		var sub = this.sub_controller_index[model.id()];
		if(sub)
		{
			sub.el.removeClass('hide');
		}
		else
		{
			sub = this.create_subcontroller(model);
			this.sub_controllers.push(sub);
			this.sub_controller_index[model.id()] = sub;
			sub.bind('release', function() {
				this.do_remove_subcontroller(sub, model.id());
			}.bind(this));
		}
	},

	remove_subcontroller: function(model)
	{
		//this.parent.apply(this, arguments);
		if(this.board.get('notes').models().length == 0)
		{
			this.display_actions.addClass('hidden');
		}

		var sub = this.sub_controller_index[model.id()];
		if(!sub) return;
		if(!sub.el)
		{
			delete this.sub_controller_index[model.id()];
			this.sub_controllers = this.sub_controllers.filter(function(s) {
				if(s == sub) return false;
				return true;
			});
			this.setup_masonry();
			return;
		}
		sub.el.addClass('hide');
	}
	// -------------------------------------------------------------------------
});

