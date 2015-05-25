var NotesItemController = NoteBaseController.extend({
	tag: 'li',
	class_name: 'note',

	events: {
		'click': 'note_click'
	},

	model: null,

	init: function()
	{
		this.render();
		var renchange = function()
		{
			this.render();
			this.trigger('update');
		}.bind(this);
		this.with_bind(this.model, 'change', renchange);
		this.with_bind(this.model.get('file'), 'change', renchange);

		this.parent();
	},

	render: function()
	{
		var type = this.model.get('type');
		var note = this.model.toJSON();
		if(note.file)
		{
			note.file.blob_url = this.model.get('file').get('blob_url');
			if(note.file.meta && note.file.meta.width && note.file.meta.height)
			{
				note.file.img_height = 100 * (note.file.meta.height / note.file.meta.width);
			}
		}
		var type_content = view.render('notes/types/'+type, {
			note: note
		});
		this.html(view.render('notes/item', {
			content: type_content,
			note: note
		}));
		this.el.className = 'note item';
		this.el.addClass(type);
		if(!this.model.get('text'))
		{
			this.el.addClass('no-text');
		}
		if(!this.model.get('title'))
		{
			this.el.addClass('no-title');
		}
		if(type == 'image' && !this.model.get('url'))
		{
			this.el.addClass('preview');
		}
		this.el.set('rel', this.model.id());
	},

	note_click: function(e)
	{
		if(e) e.stop();
		this.open_note();
	},

	open_note: function(e)
	{
		if(e) e.stop();
		new NotesViewController({
			model: this.model
		});
	}
});

