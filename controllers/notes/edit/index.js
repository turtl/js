var NotesEditController = FormController.extend({
	elements: {
		'form': 'el_form',
		'input[name=title]': 'inp_title',
		'input[name=url]': 'inp_url',
		'input[name=username]': 'inp_username',
		'input[name=password]': 'inp_password',
		'textarea[name=text]': 'inp_text',
		'.password': 'el_password',
		'.boards-container': 'el_boards',
		'.file-container': 'el_file',
		'.existing': 'el_existing',
		'.button-row': 'el_buttons'
	},

	events: {
		'click .note-boards': 'open_boards',
		'click ul.colors li': 'switch_color',
		'click .button-row ul a[rel=tag]': 'open_tags',
		'click .button-row .desc': 'open_tags',
		'change form': 'detect_change',
		'input form': 'detect_change',
		'input input[name=url]': 'check_url',
		'click .formatting a[rel=formatting]': 'show_formatting_help',
		'click .password a.preview': 'toggle_preview_password'
	},

	modal: null,
	modal_opts: null,

	model: null,
	clone: null,
	action: 'Save',
	show_cancel: false,
	formclass: 'notes-edit',
	button_tabindex: 9,
	footer_actions: [ {name: 'tag', icon: 'tag'} ],

	type: 'text',
	board_id: null,

	confirm_unsaved: null,
	have_unsaved: false,
	skip_resize_text: false,
	form_data: null,

	url_timer: null,

	init: function()
	{
		if(this.board_id == 'all') this.board_id = null;

		if(!(this.confirm_unsaved === true || this.confirm_unsaved === false))
		{
			this.confirm_unsaved = config.confirm_unsaved;
		}

		if(!this.model) this.model = new Note({
			boards: (this.board_id ? [this.board_id] : []),
			type: this.type || 'text'
		});
		this.clone = this.model.clone();
		this.clone.get('file').unset('set');

		this.parent();

		var title = '';
		switch(this.clone.get('type'))
		{
			case 'text': title = 'text note'; break;
			case 'link': title = 'bookmark'; break;
			default: title = this.clone.get('type');
		}
		title = 'Editing ' + title;

		var conf = function()
		{
			if(this.confirm_unsaved && this.have_unsaved && !confirm('This note has unsaved changes. Really leave?')) return false;
			return true;
		}.bind(this);

		this.modal = new TurtlModal(Object.merge({
			show_header: true,
			title: title,
			closefn: conf,
			actions: [
				{name: 'preview', icon: 'preview'}
			]
		}, this.modal_opts && this.modal_opts() || {}));

		// URL check setup, needs to happen before render
		if(this.model.is_new())
		{
			this.url_timer = new Timer(500);
			this.url_timer.bind('fired', function() {
				var url_search = this.inp_url.get('value');
				if(!url_search) return;
				turtl.search.search({url: url_search}).bind(this)
					.spread(function(ids) {
						ids = ids.erase(this.model.id());
						if(!ids || !ids.length)
						{
							this.el_existing.slide('out');
							return;
						}

						var msg = '<em>!</em>';
						msg += 'This URL is already bookmarked in ';
						if(ids.length == 1) msg += 'another note';
						else msg += ids.length +' notes';

						this.el_existing.set('html', msg);
						this.el_existing.slide('in');
					});
			}.bind(this));
			this.bind('check-url', this.url_timer.reset.bind(this.url_timer));
			this.bind('release', this.url_timer.unbind.bind(this.url_timer));
		}

		this.render();

		// track unsaved changes to the model
		this.form_data = this.el_form.toQueryString();
		var close = function()
		{
			this.modal.close();
		}.bind(this);

		this.modal.open(this.el);
		this.with_bind(this.modal, 'close', this.release.bind(this));
		this.with_bind(this.modal, 'header:fire-action', function(action) {
			switch(action)
			{
			case 'preview': this.open_preview(); break;
			}
		});
		this.bind(['cancel', 'close'], close);

		// handle our "you have unsaved changes" state stuff
		var unsaved = function()
		{
			var set_back = false;
			if(this.modal.el.getElement('a[rel=back]'))
			{
				set_back = true;
			}
			this.modal.set_title(title + ' <strong>*</strong>', set_back && turtl.last_url);
			this.have_unsaved = true;
			this.highlight_button();
		}.bind(this);
		this.bind('unsaved', unsaved);
		this.with_bind(this.clone, 'change', unsaved);
		this.with_bind(this.clone.get('tags'), ['add', 'remove'], unsaved);
		this.with_bind(this.clone.get('file'), 'change', unsaved);

		// basically copy tumblr's fixed footer tagging interface
		var footer_desc = function()
		{
			var tags = this.clone.get('tags').toJSON();
			if(tags.length)
			{
				this.set_desc(tags.join(', '));
			}
			else
			{
				this.set_desc('');
			}
		}.bind(this);
		this.with_bind(this.clone.get('tags'), ['add', 'remove'], footer_desc);
		footer_desc();

		var special_key_bound = this.special_key.bind(this);
		document.body.addEvent('keydown', special_key_bound);
		this.bind('release', function() {
			document.body.removeEvent('keydown', special_key_bound);
		});

		if(!this.skip_resize_text)
		{
			var resizer = this.resize_text.bind(this);
			window.addEvent('resize', resizer);
			this.bind('release', window.removeEvent.bind(window, 'resize', resizer));
		}
	},

	render: function()
	{
		var type = this.model.get('type') || this.type;
		var colors = NOTE_COLORS;
		var data = this.model.toJSON();
		if(!data.color) delete data.color;

		this.html(view.render('notes/edit/index', {
			note: data,
			type: this.model.get('type') || this.type,
			colors: colors
		}));
		setTimeout(this.resize_text.bind(this), 10);

		if(this.model.is_new())
		{
			var focus_el = null;
			switch(this.type)
			{
				case 'text': focus_el = this.inp_text; break;
				case 'link': focus_el = this.inp_url; break;
				case 'image': focus_el = this.inp_url; break;
				case 'password': focus_el = this.inp_password; break;
			}
			// NOTE: the delay here is same as CSS transition
			//
			// without this, the modal will jump forward to the textarea whlie
			// sliding in, making the transition look really ugly and stupid.
			// beware!
			if(focus_el) setTimeout(focus_el.focus.bind(focus_el), 300);
		}

		this.track_subcontroller('boards', function() {
			return new NotesEditBoardsListController({
				inject: this.el_boards,
				model: this.clone
			});
		}.bind(this));

		this.track_subcontroller('file', function() {
			return new NotesEditFileController({
				inject: this.el_file,
				model: this.clone
			});
		}.bind(this));

		if(this.el_existing)
		{
			this.check_url();
			this.el_existing.set('slide', {duration: 300});
			this.el_existing.get('slide').hide();
		}
	},

	grab_form_data: function()
	{
		var title = this.inp_title.get('value');
		var url = this.inp_url && this.inp_url.get('value');
		var username = this.inp_username && this.inp_username.get('value');
		var password = this.inp_password && this.inp_password.get('value');
		var text = this.inp_text.get('value');

		var data = {
			title: title,
			url: url,
			username: username,
			password: password,
			text: text
		};
		return data;
	},

	submit: function(e)
	{
		if(e) e.stop();

		var errors = [];

		var data = this.grab_form_data();

		if(this.model.is_new())
		{
			data.user_id = turtl.user.id();
		}

		var clone = this.clone;
		clone.key = this.model.key;
		clone.get('file').key = clone.key;
		clone.create_or_ensure_key(null, {silent: true});
		clone.set(data);

		// grab the file binary, and clear it out from the model
		var file_set = clone.get('file').get('set');
		var file_id = clone.get('file').id();
		if(file_set)
		{
			var filebin = clone.get('file').get('data');
			clone.get('file').unset('data');
		}

		if(file_set || this.model.get('file').id(true))
		{
			clone.get('file').set({id: file_id, no_preview: true}, {silent: true});
		}

		return clone.save()
			.bind(this)
			.then(function() {
				if(!this.model.key) this.model.key = clone.key;
				this.model.set(clone.toJSON({get_file: true}));
				if(clone.get('file').get('cleared'))
				{
					this.model.get('file').clear().trigger('change');
				}
				if(clone.get('file').get('set'))
				{
					this.model.get('file').trigger('change');
				}
				this.have_unsaved = false;

				// add the note to our main note list
				turtl.profile.get('notes').upsert(this.model);
				this.trigger('saved');
				this.trigger('close');
			})
			.then(function() {
				var file = this.model.get('file');
				if(clone.get('file').get('cleared'))
				{
					file.clear();
					return this.model.clear_files().bind(this)
						.then(function() {
							this.model.set({has_file: 0});
							return this.model.save();
						})
						.catch(function(err) {
							turtl.events.trigger('ui-error', 'There was a problem removing the attachement', err);
							log.error('note: edit: file: ', this.model.id(), derr(err));
						});
				}
				if(!file_set) return;
				file.unset('set').revoke();

				file.set({encrypting: true});
				clone.clear_files();
				var filedata = new FileData({data: filebin});
				filedata.key = this.model.key;
				var modeldata = {};
				log.debug('file: pre: ', filebin.length);
				return filedata.serialize().bind(this)
					.spread(function(res) {
						res.id = file_id;
						var encfile = new FileData(res);
						encfile.key = this.model.key;
						log.debug('file: post: ', file_id, res.body.length);
						encfile.set({note_id: this.model.id()});
						modeldata = {id: file_id, has_data: 2, size: res.body.length};
						// force this to be an "add"
						encfile.unset('id');
						encfile._cid = file_id;
						return encfile.save({skip_serialize: true});
					})
					.then(function() {
						// once the file is saved, update the note to have the
						// correct meta info about it
						this.model.set({has_file: 1})
							.get('file')
							.unset('encrypting')
							.set(modeldata);
						return this.model.save()
					})
					.then(function() {
						file.unset('no_preview').unset('set');
					})
					.catch(function(err) {
						turtl.events.trigger('ui-error', 'There was a problem saving the attachment', err);
						log.error('note: edit: file: ', this.model.id(), derr(err));
					});
			})
			.catch(function(err) {
				turtl.events.trigger('ui-error', 'There was a problem updating that note', err);
				log.error('note: edit: ', this.model.id(), derr(err));
			});
	},

	check_url: function(e)
	{
		this.trigger('check-url');
	},

	switch_color: function(e)
	{
		if(e) e.stop();
		var li = Composer.find_parent('ul.colors li', e.target);
		if(!li) return;
		var selected = li.hasClass('sel');
		this.el.getElements('ul.colors li').each(function(el) { el.removeClass('sel'); });
		var color = parseInt(li.get('rel'));
		if(selected)
		{
			color = 0;
		}
		else
		{
			if(color > 0)
			{
				li.addClass('sel');
			}
		}
		this.clone.set({color: color});
	},

	open_boards: function(e)
	{
		if(e) e.stop();
		new NotesEditBoardsController({
			model: this.clone,
			modal_opts: this.modal_opts
		});
	},

	open_tags: function(e)
	{
		if(e) e.stop();
		new NotesEditTagsController({
			model: this.clone,
			modal_opts: this.modal_opts
		});
	},

	detect_change: function(e)
	{
		var ser = this.el_form.toQueryString();
		if(ser == this.form_data) return;
		this.trigger('unsaved');
	},

	show_formatting_help: function(e)
	{
		if(e) e.stop();
		new MarkdownFormattingHelpController({
			modal_opts: this.modal_opts
		});
	},

	open_preview: function()
	{
		var data = this.grab_form_data();
		var preview = this.clone.clone().set(data);
		var con = new NotesEditPreviewController({
			model: preview,
			modal_opts: function() {
				var opts = (this.modal_opts && this.modal_opts()) || {};
				var actions = opts.actions || [];
				actions.push({name: 'edit', icon: 'edit'});
				opts.actions = actions;
				return opts;
			}.bind(this)
		});
		this.with_bind(con, 'save', this.submit.bind(this));
	},

	special_key: function(e)
	{
		if(e.key == 'esc')
		{
			this.trigger('close');
		}
		else if(e.key == 'enter' || e.key == 'return')
		{
			if(!Composer.match(e.target, 'textarea, input'))
			{
				this.submit(e);
			}
		}
	},

	toggle_preview_password: function(e)
	{
		if(e) e.stop();
		if(!this.inp_password) return;
		if(this.inp_password.get('type') == 'password')
		{
			this.el_password.addClass('preview');
			this.inp_password.set('type', 'text');
			this.inp_password.focus();
		}
		else
		{
			this.el_password.removeClass('preview');
			this.inp_password.set('type', 'password');
		}
	},

	resize_text: function()
	{
		var form_bottom = this.el_form.getCoordinates().bottom;
		var btn_top = this.el_buttons.getCoordinates().top;
		var diff = btn_top - form_bottom;
		var txt_height = this.inp_text.getCoordinates().height;
		var height = txt_height + diff;
		if(height < 80) height = 80;
		this.inp_text.setStyles({ height: height+'px' });
	}
});

