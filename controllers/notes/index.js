var NotesController = Composer.Controller.extend({
	elements: {
		'ul': 'note_ul'
	},

	events: {
		'click a.add-note': 'add_note'
	},

	note_item_controllers: [],

	init: function()
	{
		this.project	=	this.profile.get_current_project();
		if(!this.project) return false;
		this.render();
	},

	release: function()
	{
		this.note_item_controllers.each(function(item) {
			item.release();
		});
		this.parent.apply(this, arguments);
	},

	render: function()
	{
		var content = Template.render('notes/index', { });
		this.html(content);

		this.project.get('notes').each(function(m) {
			var item = new NoteItemController({
				inject: this.note_ul,
				note: n
			});
			this.note_item_controllers.push(item);
		}.bind(this));
	},

	add_note: function(e)
	{
		if(e) e.stop();
		new NoteEditController();
	}
});

