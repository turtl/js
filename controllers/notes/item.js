var NotesItemController = NoteBaseController.extend({
	tag: 'li',
	class_name: 'note',

	events: {
		'click': 'note_click'
	},

	model: null,

	_last_height: 0,

	init: function()
	{
		this.render();
		var renchange = function()
		{
			this.render();
			setTimeout(function() {
				if(!this.el) return;
				var height = this.el.getCoordinates().height;
				if(height == this._last_height) return;
				this._last_height = height;
				this.trigger('update');
			}.bind(this));
		}.bind(this);
		this.with_bind(this.model, 'change', renchange);
		this.with_bind(this.model.get('file'), 'change', renchange);

		this.parent();
	},

	render: function()
	{
		var type = this.model.get('type');
		var note = this.model.toJSON();
		if(!type)
		{
			throw new Error('note: bad type: '+ note.id);
		}
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

		// trigger masonry update if we have an image that loaded
		var load_img = function(img_tag)
		{
			return new Promise(function(resolve, reject) {
				if(img_tag.complete || (img_tag.naturalWidth && img_tag.naturalWidth > 0))
				{
					return resolve();
				}
				img_tag.onload = resolve;
			});
		};
		var set_height = function()
		{
			this._last_height = this.el && this.el.getCoordinates().height;
		}.bind(this);

		var imgs = this.el.getElements('img');
		if(imgs.length)
		{
			Promise.all(imgs.map(load_img)).bind(this)
				.then(function() {
					return delay(1);
				})
				.then(function() {
					setTimeout(this.trigger.bind(this, 'update'));
					set_height();
				});
		}
		else
		{
			set_height();
		}
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

