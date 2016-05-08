var NotesViewController = NoteBaseController.extend({
	class_name: 'note',

	elements: {
		'.header-backing': 'el_img_header',
		'.file': 'el_file',
		'.info-container': 'el_info',
		'.info-container .info': 'el_info_sub',
		'.info-container .info form input': 'inp_link',
		'.main-title.password': 'el_title_pass',
		'.show-password input[name=password]': 'el_password'
	},

	events: {
		'click .file a': 'open_file',
		'click .backing a[rel=download]': 'open_image',
		'click .note-gutter .content > h1': 'open_image',
		'click .info-container .preview form input': 'copy',
		'click .info-container .preview > ul': 'toggle_info',
		'click h1.main-title.password': 'show_password',
		'click .show-password input[name=password]': 'show_password',
		'focus .show-password input': 'select_password_field',
		'click .show-password input': 'select_password_field'
	},

	modal: null,
	model: null,

	_last_scroll: null,

	hide_actions: false,
	title: false,

	init: function()
	{
		if(!this.model)
		{
			this.release();
			throw new Error('notes: view: no model passed');
		}
		var actions = [];
		if(!this.hide_actions)
		{
			actions = [
				{name: 'menu', actions: [/*{name: 'Edit'},*/ {name: 'Delete'}]}
			];
		}
		this.modal = new TurtlModal(Object.merge({
			show_header: true,
			title: this.title,
			actions: actions
		}, this.modal_opts && this.modal_opts() || {}));
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
			if(!this.el_info) return;
			var inside = Composer.find_parent('.preview', e.target);
			if(inside || !this.el_info.hasClass('open')) return;
			this.toggle_info();
		}.bind(this);
		document.body.addEvent('click', click_outside);
		this.bind('release', function() { document.body.removeEvent('click', click_outside); });

		// set up the action button
		if(!this.hide_actions)
		{
			this.track_subcontroller('actions', function() {
				var actions = new ActionController({inject: this.modal.el});
				actions.set_actions([{title: 'Edit note', name: 'edit', icon: 'edit'}]);
				this.with_bind(actions, 'actions:fire', this.open_edit.bind(this, null));
				return actions;
			}.bind(this));
		}

		this.parent();

		this.with_bind(turtl.keyboard, 'delete', this.open_delete.bind(this));
		this.with_bind(turtl.keyboard, 'e', this.open_edit.bind(this));
	},

	render: function()
	{
		var type = this.model.get('type');
		var note = this.model.toJSON();
		if(type == 'image' && !note.url && !(note.file || {}).name)
		{
			type = 'text';
		}
		if(note.file)
		{
			note.file.blob_url = this.model.get('file').get('blob_url');
			if(note.file.meta && note.file.meta.width && note.file.meta.height)
			{
				note.file.img_height = 100 * (note.file.meta.height / note.file.meta.width);
			}
		}
		var show_info = false;
		if(note.boards.length || note.tags.length) show_info = true;
		var type_content = view.render('notes/types/'+type, {
			note: note,
			show_info: show_info
		});
		this.html(view.render('notes/view', {
			note: note,
			content: type_content
		})).bind(this)
			.then(function() {
				this.el.className = 'note view';
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

				// let the app know that we're displaying a note of this type
				var remove_class = function()
				{
					this.modal.el.className = this.modal.el.className.replace(/note-view note-[a-z0-9]+/, '');
				}.bind(this);
				var body_class = 'note-view note-'+type;
				remove_class();
				this.modal.el.addClass(body_class);

				(function() {
					if(!this.el_img_header) return;
					this.el_img_header.removeClass('hide');
				}).delay(10, this);
			});
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
				var name = this.model.get('file').get('name');
				return download_blob(blob, {name: name});
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
		if(!this.el_info) return;

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
		if(!this.el_info) return;
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
	},

	show_password: function(e)
	{
		if(e) e.stop();
		if(this.el_password.get('type') == 'password')
		{
			this.el_title_pass.addClass('active');
			var pass = this.model.get('password');
			this.el_password
				.set('type', 'text')
				.set('value', pass);
			this.el_password.focus();
		}
		else
		{
			this.el_title_pass.removeClass('active');
			this.el_password
				.set('type', 'password')
				.set('value', '********');
		}
	},

	select_password_field: function(e)
	{
		var inp = Composer.find_parent('input', e.target);
		if(!inp) return;
		if(inp.get('type') == 'password') return;
		inp.select();
	}
});

