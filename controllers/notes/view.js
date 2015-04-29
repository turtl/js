var NotesViewController = NoteBaseController.extend({
	class_name: 'note',

	elements: {
		'.header-backing': 'el_img_header',
		'.file': 'el_file',
		'.info-container': 'el_info',
		'.info-container .info': 'el_info_sub',
		'.info-container .info form input': 'inp_link'
	},

	events: {
		'click .file a': 'open_file',
		'click .backing a[rel=download]': 'open_image',
		'click .note-gutter .content > h1': 'open_image',
		'click .info-container .preview form input': 'copy',
		'click .info-container .preview > ul': 'toggle_info'
	},

	modal: null,

	model: null,

	_last_scroll: null,

	init: function()
	{
		if(!this.model)
		{
			this.release();
			throw new Error('notes: view: no model passed');
		}
		this.modal = new TurtlModal({
			show_header: true,
			actions: [
				{name: 'menu', actions: [/*{name: 'Edit'},*/ {name: 'Delete'}]}
			]
		});
		this.render();

		var close = this.modal.close.bind(this.modal);
		this.modal.open(this.el);
		this.with_bind(this.modal, 'close', this.release.bind(this));
		this.bind(['cancel', 'close'], close);

		this.with_bind(this.model, 'change', this.render.bind(this));
		this.with_bind(this.model.get('file'), 'change', this.render.bind(this));
		this.with_bind(this.model, 'destroy', close);
		this.with_bind(this.modal, 'header:menu:fire-action', function(action) {
			switch(action)
			{
				case 'edit': this.open_edit(); break;
				case 'delete': this.open_delete(); break;
			}
		}.bind(this));
		this.with_bind(this.modal, 'scroll', function(scroll) {
			this.adjust_image_header(scroll);
			this.hide_info(scroll);
		}.bind(this));
		var interval = setInterval(function() {
			this.modal.trigger('scroll', this.modal.el.scrollTop);
		}.bind(this), 100);
		this.bind('release', clearInterval.bind(window, interval));

		var click_outside = function(e)
		{
			var inside = Composer.find_parent('.preview', e.target);
			if(inside || !this.el_info.hasClass('open')) return;
			this.toggle_info();
		}.bind(this);
		document.body.addEvent('click', click_outside);
		this.bind('release', function() { document.body.removeEvent('click', click_outside); });

		// set up the action button
		this.track_subcontroller('actions', function() {
			var actions = new ActionController({inject: this.modal.el});
			actions.set_actions([{title: 'Edit note', name: 'edit', icon: 'edit'}]);
			this.with_bind(actions, 'actions:fire', this.open_edit.bind(this, null));
			return actions;
		}.bind(this));

		this.parent();
	},

	render: function()
	{
		var type = this.model.get('type');
		var note = this.model.toJSON();
		if(note.file) note.file.blob_url = this.model.get('file').get('blob_url');
		var type_content = view.render('notes/types/'+type, {
			note: note,
			show_info: true
		});
		this.html(view.render('notes/view', {
			note: note,
			content: type_content
		}));
		this.el.className = 'note view';
		this.el.addClass(type);
		if(type == 'image' && !this.model.get('url'))
		{
			this.el.addClass('preview');
		}
		this.el.set('rel', this.model.id());

		// let the app know that we're displaying a note of this type
		var remove_class = function()
		{
			this.modal.el.className = this.modal.el.className.replace(/note-view note-[a-z0-9]+/, '');
		}.bind(this);
		var body_class = 'note-view note-'+this.model.get('type');
		remove_class();
		this.modal.el.addClass(body_class);

		(function() {
			if(!this.el_img_header) return;
			this.el_img_header.removeClass('hide');
		}).delay(10, this);
	},

	open_edit: function(e)
	{
		if(e) e.stop();
		new NotesEditController({
			model: this.model
		});
	},

	open_delete: function(e)
	{
		if(e) e.stop();
		if(!confirm('Really delete this note?')) return false;
		this.model.destroy()
			.catch(function(err) {
				log.error('note: delete: ', derr(err));
				barfr.barf('There was a problem deleting your note: '+ err.message);
			});
	},

	open_file: function(e)
	{
		if(e) e.stop();
		if(this.el_file.hasClass('decrypting')) return false;
		var atag = Composer.find_parent('a', e.target);
		if(!atag) return false;

		this.el_file.addClass('decrypting');
		atag.set('title', 'Decrypting, this can take a bit.');
		var promise;
		var url;
		return this.model.get('file').to_blob({force: true}).bind(this)
			.then(function(blob) {
				url = URL.createObjectURL(blob);
				return url;
			})
			.then(function(blob_url) {
				var name = this.model.get('file').get('name');
				var download = new Element('a')
					.setStyles({visibility: 'hidden'})
					.set('html', 'Download '+ name.safe())
					.addClass('attachment')
					.setProperties({
						href: url,
						download: name,
						target: '_blank'
					});

				download.inject(document.body);
				fire_click(download);
				(function() {
					download.destroy();
				}).delay(5000, this);
			})
			.catch(function(err) {
				turtl.events.trigger('ui-error', 'There was a problem opening that file', err);
				log.error('note: file: open: ', this.model.id(), derr(err));
			})
			.finally(function() {
				this.el_file.removeClass('decrypting');
				atag.set('title', '');
				if(url) URL.revokeObjectURL(url);
			});
	},

	open_image: function(e)
	{
		var img = this.el.getElement('.backing img');
		var type = this.model.get('type');
		if(type != 'image' || !img) return;

		if(e) e.stop();

		img.click();
	},

	copy: function(e)
	{
		if(e) e.stop();
		//this.inp_link.select();
	},

	toggle_info: function(e)
	{
		if(e) e.stop();

		if(this.el_info.hasClass('open'))
		{
			this.el_info.removeClass('open');
		}
		else
		{
			this.el_info.addClass('open');
			//this.inp_link.select();
		}
	},

	adjust_image_header: function()
	{
		if(this.model.get('type') != 'image') return;
		var backing = this.el.getElement('.backing');
		if(!backing) return;
		var header = Composer.find_parent('.turtl-modal', this.el).getElement('header');
		var scroll = this.modal.el.scrollTop;
		var img_bot = backing.getCoordinates().height;
		if(scroll > img_bot)
		{
			header.addClass('scrolled');
		}
		else
		{
			header.removeClass('scrolled');
		}
	},

	hide_info: function(scroll)
	{
		if(this._last_scroll == scroll) return;
		this._last_scroll = scroll;

		if(this.el_info.hasClass('open')) return;

		if(scroll > 50 && !this.el_info.hasClass('scrolled'))
		{
			this.el_info.addClass('scrolled');
			this.el_info.removeClass('open');
			setTimeout(function() {
				if(scroll <= 50) return;
				this.el_info.addClass('hidden');
			}.bind(this), 300);
		}
		else if(scroll <= 50 && this.el_info.hasClass('scrolled'))
		{
			this.el_info.removeClass('hidden');
			setTimeout(function() {
				this.el_info.removeClass('scrolled');
			}.bind(this));
		}
	}
});

