var NotesController = Composer.Controller.extend({
	elements: {
		'ul.note_list': 'note_list',
		'ul.list-type': 'display_actions'
	},

	events: {
		'click a.add-note': 'open_add_note',
		'click ul.list-type a': 'change_list_type'
	},

	project: null,
	filter_list: null,
	note_item_controllers: [],

	masonry: null,

	init: function()
	{
		if(!this.project) return false;
		if(!this.project.get('display_type')) this.project.set({display_type: 'masonry'});

		this.render();

		this.filter_list	=	new NotesFilter(this.project.get('notes'), {
			filter: function(note)
			{
				var selected	=	this.project.get_selected_tags().map(function(t) { return t.get('name'); });
				var excluded	=	this.project.get_excluded_tags().map(function(t) { return t.get('name'); });;
				var note_tags	=	note.get('tags').map(function(t) { return t.get('name'); });

				if(selected.length == 0 && excluded.length == 0) return true;
				if(selected.length > note_tags.length) return false;
				for(var x in selected)
				{
					var sel	=	selected[x];
					if(typeOf(sel) != 'string') continue;
					if(!note_tags.contains(sel)) return false;
				}

				for(var x in excluded)
				{
					var exc	=	excluded[x];
					if(typeOf(exc) != 'string') continue;
					if(note_tags.contains(exc)) return false;
				}
				return true;
			}.bind(this),

			sortfn: function(a, b)
			{
				var sort = a.get('sort') - b.get('sort');
				if(sort != 0) return sort;
				return a.id().localeCompare(b.id());
			}
		});

		this.project.bind_relational('tags', ['change:filters', 'change:selected', 'change:excluded'], function() {
			this.filter_list.refresh({diff_events: true, silent: 'reset'});
			if(this.project.get('display_type') == 'masonry')
			{
				this.setup_masonry();
			}
		}.bind(this), 'notes:listing:track_filters');

		this.project.bind('change:display_type', this.update_display_type.bind(this), 'notes:listing:display_type');
		this.filter_list.bind('reset', function() {
			this.update_display_type.delay(10, this);
		}.bind(this), 'notes:listing:display_type');

		this.project.get('notes').bind(['add', 'remove', 'reset', 'clear'], function() {
			if(this.project.get('notes').models().length == 0)
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
	},

	release: function()
	{
		if(this.project)
		{
			this.project.unbind_relational('tags', ['change:filters', 'change:selected', 'change:excluded'], 'notes:listing:track_filters');
			this.project.unbind('change:display_type', 'notes:listing:display_type');
			this.filter_list.unbind('reset', 'notes:listing:display_type');
			this.project.get('notes').unbind(['add', 'remove', 'reset', 'clear'], 'notes:listing:show_display_buttons');
			this.filter_list.detach();
		}
		tagit.keyboard.unbind('a', 'notes:shortcut:add_note')
		this.parent.apply(this, arguments);
	},

	render: function()
	{
		var content = Template.render('notes/index', {
			display_type: this.project.get('display_type')
		});
		this.html(content);
	},

	open_add_note: function(e)
	{
		if(e) e.stop();
		new NoteEditController({
			project: this.project
		});
	},

	create_subcontroller: function(note)
	{
		return new NoteItemController({
			inject: this.note_list,
			project: this.project,
			model: note,
			display_type: this.project.get('display_type')
		});
	},

	// extended from TrackController
	remove_subcontroller: function(note)
	{
		this.parent.apply(this, arguments);
		if(this.project.get('notes').models().length == 0)
		{
			this.display_actions.addClass('hidden');
		}
	},

	change_list_type: function(e)
	{
		if(!e) return;
		e.stop()

		var a = next_tag_up('a', e.target);
		var type = a.className.replace(/sel/g, '').clean().toLowerCase();
		if(type == '') return;
		this.project.set({display_type: type});
	},

	update_display_type: function()
	{
		var type = this.project.get('display_type', 'grid');
		this.note_list.className = this.note_list.className.replace(/list_[\w]+/g, '');
		this.note_list.addClass('list_'+type);
		$ES('li a', this.display_actions).each(function(a) {
			a.removeClass('sel');
		});
		$E('li a.'+this.project.get('display_type', 'grid')).addClass('sel');
		if(type == 'masonry')
		{
			this.setup_masonry();
		}
		else
		{
			if(this.masonry) this.masonry.detach()
			this.masonry = null;
			this.note_list.getElements('> li').each(function(li) {
				li.setStyles({
					position: '',
					left: '',
					top: ''
				});
			});
		}
	},

	setup_masonry: function()
	{
		if(this.masonry)
		{
			this.masonry.go();
		}
		else
		{
			this.masonry = this.note_list.masonry({
				singleMode: true,
				itemSelector: '> li'
			});
		}
	}
}, TrackController);

