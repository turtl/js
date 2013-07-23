var NotesController = TrackController.extend({
	elements: {
		'ul.note_list': 'note_list',
		'ul.list-type': 'display_actions'
	},

	events: {
		'click a.add-note': 'open_add_note',
		'click ul.list-type a': 'change_list_type'
	},

	board: null,
	filter_list: null,
	note_item_controllers: [],

	masonry: null,
	sort_notes: null,
	sorting: false,		// used to track whether sorting or not for edge scrolling

	init: function()
	{
		if(!this.board) return false;
		if(!this.board.get('display_type')) this.board.set({display_type: 'masonry'});

		this.render();

		var board_id	=	this.board.id();
		var last_search	=	null;
		this.filter_list	=	new NotesFilter(this.board.get('notes'), {
			sort_event: true,
			refresh_on_change: false,
			filter: function(note)
			{
				if(!last_search) return true;
				if(last_search.contains(note.id())) return true;
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
			var start = performance.now();
			// pre-cache our selected/excluded tags
			var selected = this.board.get_selected_tags().map(function(t) { return t.get('name'); });
			var excluded = this.board.get_excluded_tags().map(function(t) { return '!'+t.get('name'); });;
			if(selected.length == 0 && excluded.length == 0)
			{
				last_search = false;
			}
			else
			{
				last_search	=	tagit.search.search({
					boards: this.board.id(),
					tags: selected.append(excluded)
				});
			}
			this.filter_list.refresh({diff_events: true, silent: 'reset'});
			console.log('filter time: ', performance.now() - start);
			if(this.board.get('display_type') == 'masonry')
			{
				this.setup_masonry.delay(10, this);
			}
			this.setup_sort();
		}.bind(this), 'notes:listing:track_filters');

		this.board.bind('change:display_type', this.update_display_type.bind(this), 'notes:listing:display_type');
		this.filter_list.bind('reset', function() {
			this.update_display_type.delay(10, this);
		}.bind(this), 'notes:listing:display_type');
		this.filter_list.bind(['add', 'remove', 'change'], function() {
			if(this.board.get('display_type') == 'masonry')
			{
				this.setup_masonry.delay(10, this);
			}
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

		tagit.keyboard.bind('a', this.open_add_note.bind(this), 'notes:shortcut:add_note');
		tagit.keyboard.bind('enter', this.sub_view_note.bind(this), 'notes:shortcut:view_note');
		tagit.keyboard.bind('e', this.sub_edit_note.bind(this), 'notes:shortcut:edit_note');
		tagit.keyboard.bind('m', this.sub_move_note.bind(this), 'notes:shortcut:move_note');
		tagit.keyboard.bind('delete', this.sub_delete_note.bind(this), 'notes:shortcut:delete_note');

		if(this.board.get('display_type') == 'masonry')
		{
			this.setup_masonry.delay(10, this);
		}
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
		tagit.keyboard.unbind('a', 'notes:shortcut:add_note')
		tagit.keyboard.unbind('enter', 'notes:shortcut:view_note');
		tagit.keyboard.unbind('e', 'notes:shortcut:edit_note');
		tagit.keyboard.unbind('m', 'notes:shortcut:move_note');
		tagit.keyboard.unbind('delete', 'notes:shortcut:delete_note');
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
			this.note_list.setStyles({position: '', height: ''});
			this.masonry = null;
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
		if(this.masonry) this.masonry.detach();
		this.masonry = this.note_list.masonry({
			singleMode: true,
			itemSelector: '> li.note:not(.hide)'
		});
		$ES('li.note img', this.note_list).each(function(img) {
			if(img.complete || (img.naturalWidth && img.naturalWidth > 0)) return;
			img.onload = function() {
				img.onload = null;
				this.setup_masonry();
			}.bind(this);
		}.bind(this));
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
		var type = this.board.get('display_type', 'grid');
		if(this.sort_notes) this.sort_notes.detach();
		$(window).removeEvent('mousemove', this.edge_check);
		if(type == 'masonry') return false;

		this.sort_notes	=	new Sortables(this.note_list, {
			clone: true,
			opacity: .5,
			handle: '.actions a.sort span',
			onStart: function() {
				this.sorting	=	true;
			}.bind(this),
			onComplete: function() {
				this.sorting	=	false;
				var ids	=	this.note_list.getElements('> li.note').map(function(el) {
					return el.className.replace(/^.*id_([0-9a-f-]+).*?$/, '$1').clean();
				});

				// save all note sorts as a batch
				var notes_collection	=	this.board.get('notes');
				notes_collection.start_batch_save();
				notes_collection.each(function(note) {
					if(!ids.contains(note.id())) return;
					note.set({sort: ids.indexOf(note.id())});
				});
				notes_collection.finish_batch_save({
					shared: this.board.get('shared'),
					persona: this.board.get_shared_persona()
				});
			}.bind(this)
		});

		$(window).addEvent('mousemove', this.edge_check);
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

