const NotesItemController = NoteBaseController.extend({
	tag: 'li',
	class_name: 'note',

	events: {
		'click': 'note_click'
	},

	model: null,
	extra_class: 'item',
	// if true, this note cannot be opened
	prohibit_open: false,

	_last_height: 0,

	init: function()
	{
		this.render();
		var renchange = function()
		{
			var last = this._last_height;
			this.render();
			setTimeout(function() {
				if(!this.el) return;
				var height = this.el.getCoordinates().height;
				if(height == last) return;
				this._last_height = height;
				this.trigger('update');
			}.bind(this));
		}.bind(this);
		this.with_bind(this.model, 'change', renchange);
		this.with_bind(this.model.get('file'), 'change', renchange);

		var hammer = new Hammer.Manager(this.el, {domEvents: true});
		hammer.add(new Hammer.Press({time: 750}));
		hammer.on('press', function(e) {
			this.open_edit();
		}.bind(this));
		hammer.on('pressup', function(e) {
			this._cancel_click = true;
			setTimeout(function() { this._cancel_click = false; }.bind(this), 200);
		}.bind(this));
		this.bind('release', function() {
			hammer.destroy();
		});

		this.parent();
	},

	render: function()
	{
		var type = this.model.get('type');
		var note = this.model.toJSON();
		var note_error = false;
		if(!type) {
			type = 'text';
			note_error = true;
			this.malformed_note(note);
		}
		if(note.file) {
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
		})).bind(this)
			.then(function() {
				this.el.className = 'note '+this.extra_class;
				this.el.addClass(type);
				var is_password = this.model.get('type') == 'password';
				if(!this.model.get('text'))
				{
					this.el.addClass('no-text');
				}
				if(!this.model.get('title') && !is_password)
				{
					this.el.addClass('no-title');
				}
				if(type == 'image' && !this.model.get('url'))
				{
					this.el.addClass('preview');
				}
				if(note_error) {
					this.el.addClass('note-error');
				}
				this.el.set('rel', this.model.id());

				// trigger masonry update if we have an image that loaded
				var load_img = function(img_tag)
				{
					return new Promise(function(resolve, reject) {
						if(img_tag.complete || (img_tag.naturalWidth && img_tag.naturalWidth > 0)) {
							return resolve();
						}
						var loader = new Image();
						loader.onload = resolve;
						loader.src = img_tag.get('src');
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
			});
	},

	note_click: function(e) {
		if(this.prohibit_open) return;
		// hammer press hack
		if(this._cancel_click) return;

		var event = e.event || {};
		var atag = Composer.find_parent('li.note a', e.target, this.el);
		// middle click
		if(atag && (event.button == 4 || event.which == 2)) return;
		// shift/ctrl+click
		if(atag && (e.control || e.shift)) return;

		// nvm lolol open the note
		if(e) e.stop();
		this.open_note();
	},

	open_note: function(e) {
		if(this.prohibit_open) return;
		if(e) e.stop();
		new NotesViewController({
			model: this.model,
			embed_notes: true,
		});
	},

	open_edit: function(e) {
		if(e) e.stop();
		var space = turtl.profile.current_space();
		if(!permcheck(space, Permissions.permissions.edit_note)) return;
		new NotesEditController({
			model: this.model
		});
	},
});

