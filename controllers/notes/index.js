var NotesController = Composer.Controller.extend({
	elements: {
		'ul.note_ul': 'note_ul'
	},

	events: {
		'click a.add-note': 'open_add_note'
	},

	project: null,
	note_item_controllers: [],

	init: function()
	{
		this.project	=	this.profile.get_current_project();
		if(!this.project) return false;

		this.project.bind_relational('tags', ['add', 'remove', 'reset', 'change'], this.render.bind(this), 'notes:listing:track_tags');
		this.project.bind_relational('notes', 'add', this.add_note.bind(this), 'notes:listing:track_notes:add');
		this.project.bind_relational('notes', 'remove', this.remove_note.bind(this), 'notes:listing:track_notes:remove');
		this.project.bind('reset', this.render.bind(this), 'notes:listing:track_reset');
		this.render();
	},

	release_notes: function()
	{
		this.note_item_controllers.each(function(item) {
			item.release();
		});
	},

	release: function()
	{
		if(this.project)
		{
			this.project.unbind_relational('tags', ['add', 'remove', 'reset', 'change'], 'notes:listing:track_tags');
			this.project.unbind_relational('notes', 'add', 'notes:listing:track_notes:add');
			this.project.unbind_relational('notes', 'remove', 'notes:listing:track_notes:remove');
			this.project.unbind('reset', 'notes:listing:track_reset');
		}
		this.release_notes();
		this.parent.apply(this, arguments);
	},

	render: function()
	{
		var content = Template.render('notes/index', {
			num_notes: this.project.get('notes').models().length
		});
		this.html(content);
		this.release_notes();
		this.project.get('notes').each(function(note) {
			this.add_note(note);
		}.bind(this));
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
		var item = new NoteItemController({
			inject: this.note_ul,
			note: note
		});
		this.note_item_controllers.push(item);
	},

	remove_note: function(note)
	{
		var note_controller = this.note_item_controllers.filter(function(c) {
		});
	}
});

