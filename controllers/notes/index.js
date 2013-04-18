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
	note_item_controllers: [],

	init: function()
	{
		this.project	=	this.profile.get_current_project();
		if(!this.project) return false;
		if(!this.project.get('display_type')) this.project.set({display_type: 'grid'});

		this.project.bind_relational('tags', ['change:selected', 'change:excluded'], this.render.bind(this), 'notes:listing:track_tags');
		this.project.bind_relational('notes', 'add', this.add_note.bind(this), 'notes:listing:track_notes:add');
		this.project.bind_relational('notes', 'remove', this.remove_note.bind(this), 'notes:listing:track_notes:remove');
		this.project.bind('change:display_type', this.update_display_type.bind(this), 'notes:listing:display_type');
		this.render();
	},

	release_notes: function()
	{
		this.note_item_controllers.each(function(item) {
			item.release();
		});
		this.note_item_controllers = [];
	},

	release: function()
	{
		if(this.project)
		{
			this.project.unbind_relational('tags', ['change:selected', 'change:excluded'], 'notes:listing:track_tags');
			this.project.unbind_relational('notes', 'add', 'notes:listing:track_notes:add');
			this.project.unbind_relational('notes', 'remove', 'notes:listing:track_notes:remove');
			this.project.unbind('change:display_type', 'notes:listing:display_type');
		}
		this.release_notes();
		this.parent.apply(this, arguments);
	},

	render: function()
	{
		var content = Template.render('notes/index', {
			display_type: this.project.get('display_type')
		});
		this.html(content);
		this.release_notes();
	},

	open_add_note: function(e)
	{
		if(e) e.stop();
		new NoteEditController({
			project: this.project
		});
	},

	add_note: function(note)
	{
		this.remove_note(note);
		var item = new NoteItemController({
			inject: this.note_list,
			note: note,
			display_type: this.project.get('display_type')
		});
		this.note_item_controllers.push(item);
		this.display_actions.removeClass('hidden');
	},

	remove_note: function(note)
	{
		var note_controller = this.note_item_controllers.filter(function(c) {
			if(note.id() == c.note.id()) return true;
			return false;
		});
		this.note_item_controllers = this.note_item_controllers.filter(function(c) {
			if(note_controller.contains(c)) return false;
			return true;
		});
		note_controller.each(function(c) {
			c.release();
		});
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
		this.note_list.className = this.note_list.className.replace(/list_[\w]+/g, '');
		this.note_list.addClass('list_'+this.project.get('display_type', 'grid'));
		$ES('li a', this.display_actions).each(function(a) {
			a.removeClass('sel');
		});
		$E('li a.'+this.project.get('display_type', 'grid')).addClass('sel');
	}
});

