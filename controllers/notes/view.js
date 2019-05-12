const NotesViewController = NoteBaseController.extend({
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
		'click .file.download a': 'open_file',
		'click .backing a[rel=download]': 'open_image',
		'click .note-gutter .content > h1': 'open_image',
		'click .info-container .preview form input': 'copy',
		'click .info-container .preview > ul': 'toggle_info',
		'click h1.main-title.password': 'show_password',
		'click .show-password input[name=password]': 'show_password',
		'focus .show-password input': 'select_password_field',
		'click .show-password input': 'select_password_field',
		'click a[href^="#"]:not([rel=download]):not([rel=password])': 'anchor_click'
	},

	modal: null,
	model: null,

	_last_scroll: null,

	hide_actions: false,
	title: false,

	init: function()
	{
		if(!this.model) {
			this.release();
			throw new Error('notes: view: no model passed');
		}
		const context = turtl.context.grab(this);
		var space = turtl.profile.current_space();

		this.modal = new TurtlModal(Object.merge({
			show_header: true,
			title: this.title,
			actions: [],
			context: context,
		}, this.modal_opts && this.modal_opts() || {}));
		var setup_actions = function() {
			var actions = [];
			if(!this.hide_actions) {
				if(space.can_i(Permissions.permissions.delete_note)) {
					actions.push({name: 'menu', actions: [
						{name: i18next.t('Copy link to note'), action: 'copy-link'},
						{name: i18next.t('Delete'), action: 'delete'},
						{name: i18next.t('Move note to another space'), action: 'move'},
					]});
				}
			}
			this.modal.actions = actions;
			this.modal.render_header();
		}.bind(this);
		setup_actions();
		this.with_bind(space.get('members'), ['change', 'reset'], setup_actions);
		this.render();

		var close = this.modal.close.bind(this.modal);
		this.modal.open(this.el);
		this.with_bind(this.modal, 'close', this.release.bind(this));
		this.bind(['cancel', 'close'], close);

		this.with_bind(this.model, 'change', this.render.bind(this));
		this.with_bind(this.model.get('file'), 'change', this.render.bind(this));
		this.with_bind(this.model, 'destroy', close);
		this.with_bind(this.modal, 'header:menu:fire-action', function(action) {
			switch(action) {
				case 'copy-link': this.copy_link(); break;
				case 'delete': this.open_delete(); break;
				case 'move': this.open_move(); break;
			}
		}.bind(this));

		// if we have an edit icon, it's because we're in preview mode and we
		// want the edit icon to take us back to the editor
		this.with_bind(this.modal, 'header:fire-action', function(action) {
			switch(action)
			{
			case 'edit': close(); break;
			}
		});

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
			var button_actions = [];
			if(space.can_i(Permissions.permissions.edit_note)) {
				button_actions.push({title: i18next.t('Edit note'), name: 'edit', icon: 'edit'});
			}
			if(button_actions.length > 0) {
				this.track_subcontroller('actions', function() {
					var actions = new ActionController({
						inject: this.modal.el,
						context: context,
					});
					actions.set_actions(button_actions);
					this.with_bind(actions, 'actions:fire', this.open_edit.bind(this, null));
					return actions;
				}.bind(this));
			}
		}

		this.parent();

		this.with_bind(context, 'delete', this.open_delete.bind(this));
		this.with_bind(context, 'e', this.open_edit.bind(this));
	},

	render: function()
	{
		var type = this.model.get('type');
		var note = this.model.toJSON();
		if(!type) {
			type = 'text';
			this.malformed_note(note);
		}
		if(type == 'image' && !note.url && !(note.file || {}).name) {
			type = 'text';
		}
		if(note.file) {
			note.file.blob_url = this.model.get('file').get('blob_url');
			if(note.file.meta && note.file.meta.width && note.file.meta.height)
			{
				note.file.img_height = 100 * (note.file.meta.height / note.file.meta.width);
			}
		}
		var show_info = false;
		if(note.board_id || note.tags.length) show_info = true;
		var type_content = view.render('notes/types/'+type, {
			note: note,
			show_info: show_info
		});
		return this.html(view.render('notes/view', {
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
		var space = turtl.profile.current_space();
		if(!permcheck(space, Permissions.permissions.edit_note)) return;
		new NotesEditController({
			model: this.model
		});
	},

	open_delete: function(e)
	{
		if(e) e.stop();
		var space = turtl.profile.current_space();
		if(!permcheck(space, Permissions.permissions.delete_note)) return;
		if(!confirm(i18next.t('Really delete this note?'))) return false;
		this.model.destroy()
			.catch(function(err) {
				log.error('note: delete: ', derr(err));
				barfr.barf(i18next.t('There was a problem deleting your note: {{err}}', {err: err.message}));
			});
	},

	open_move: function(e) {
		if(e) e.stop();
		this.trigger('close');
		new NotesMoveController({
			model: this.model,
		});
	},

	open_file: function(e)
	{
		if(e) e.stop();
		if(!this.el_file) return;
		if(this.el_file.hasClass('decrypting')) return false;
		var atag = Composer.find_parent('a', e.target);
		if(!atag) return false;

		this.el_file.addClass('decrypting');
		atag.set('title', 'Decrypting, this can take a bit.');
		var url;
		return this.model.get('file').to_blob({force: true}).bind(this)
			.then(function(blob) {
				var name = this.model.get('file').get('name');
				return download_blob(blob, {name: name});
			})
			.catch(function(err) {
				turtl.events.trigger('ui-error', i18next.t('There was a problem opening that file'), err);
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
	},

	anchor_click: function(e)
	{
		if(e) e.stop();
		if(!e.target) return;
		var atag = Composer.find_parent('a', e.target);
		if(!atag || !atag.href) return;
		var id = atag.href.replace(/.*#/, '');
		if(!id) return;

		var el = this.el.getElement('a[name='+id+']');
		if(!el) el = this.el.getElement('#'+id);
		if(!el) return;

		this.modal.scroll_to(el);
	},

	copy_link: function() {
		if(!ClipboardJS.isSupported()) {
			log.warn('NotesViewController.copy_link() -- clipboard API not supported');
			return;
		}
		const link = 'note::'+this.model.id();
		const el_id = 'copy-id-'+this.model.id();
		const div = new Element('div');
		div.setStyles({position: 'absolute', left: -9999, width: 1});
		div.set('html', [
			'<input id="'+el_id+'" type="button" data-clipboard-text="'+link+'">',
		].join('\n'));
		div.inject(document.body);
		const btn = div.getElement('#'+el_id);
		const clip = new ClipboardJS('#'+el_id);
		Composer.fire_event(btn, 'click');
		setTimeout(clip.destroy.bind(clip));
		barfr.barf(i18next.t('Copied!'));
	},
});

