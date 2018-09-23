var NotesEditController = FormController.extend({
	xdom: true,

	elements: {
		'form': 'el_form',
		'select[name=board_id]': 'inp_board',
		'input[name=title]': 'inp_title',
		'input[name=url]': 'inp_url',
		'input[name=username]': 'inp_username',
		'input[name=password]': 'inp_password',
		'textarea[name=text]': 'inp_text',
		'.password': 'el_password',
		'.file-container': 'el_file',
		'.button-row': 'el_buttons'
	},

	events: {
		'click ul.colors li': 'switch_color',
		'click .button-row ul a[rel=tag]': 'open_tags',
		'click .button-row .desc': 'open_tags',
		'change select[name=board_id]': 'update_selected_id',
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
	action: null,
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

	view_state: {
		text_height: null,
		already_bookmarked: false,
	},

	init: function()
	{
		if(!this.action) this.action = i18next.t('Save');
		if(!(this.confirm_unsaved === true || this.confirm_unsaved === false))
		{
			this.confirm_unsaved = config.confirm_unsaved;
		}

		var space = turtl.profile.current_space();
		var board_id = this.board_id || turtl.param_router.get().board_id;
		if(!board_id) {
			board_id = space.setting('last_board_used_for_edit');
		}
		if(!this.model) {
			this.model = new Note({
				board_id: board_id,
				type: this.type || 'text'
			});
			this.bind('release', function() {
				this.model.unbind();
			}.bind(this));
		}

		var perm_map = {
			add: Permissions.permissions.add_note,
			edit: Permissions.permissions.edit_note,
		};
		if(!permcheck(space, perm_map[this.model.is_new() ? 'add' : 'edit'])) return this.release();

		this.clone = this.model.clone();
		this.clone.enable_sync = false;
		this.clone.get('file').unset('set');
		this.bind('release', this.clone.unbind.bind(this.clone));

		this.parent();

		var title = '';
		switch(this.clone.get('type'))
		{
			case 'text': title = i18next.t('text note'); break;
			case 'link': title = i18next.t('bookmark'); break;
			case 'image': title = i18next.t('image'); break;
			case 'file': title = i18next.t('file'); break;
			case 'password': title = i18next.t('password'); break;			
			default: title = this.clone.get('type');
		}
		title = i18next.t('Editing {{title}}', {title: title});

		var conf = function()
		{
			if(this.confirm_unsaved && this.have_unsaved && !confirm(i18next.t('This note has unsaved changes. Really leave?'))) return false;
			return true;
		}.bind(this);

		if(!this.skip_modal) {
			this.modal = new TurtlModal(Object.merge({
				show_header: true,
				title: title,
				closefn: conf,
				actions: [
					{name: 'preview', icon: 'preview'}
				]
			}, this.modal_opts && this.modal_opts() || {}));
		}

		// URL check setup, needs to happen before render
		if(this.model.is_new())
		{
			var url_timer = new Timer(500);
			this.with_bind(url_timer, 'fired', function() {
				if(!this.inp_url) {
					this.view_state.already_bookmarked = false;
					this.render();
					return;
				}
				var url_search = this.inp_url.get('value');
				if(!url_search) return;
				turtl.search.search({space: turtl.profile.current_space().id(), url: url_search})
					.bind(this)
					.spread(function(ids) {
						ids = ids.erase(this.model.id());
						if(ids && ids.length > 0) {
							this.view_state.already_bookmarked = ids.length;
						} else {
							this.view_state.already_bookmarked = false;
						}
						this.render();
					})
					.catch(function(err) {
						log.error('Notes: edit: problem finding note by url: ', err);
					});
			}.bind(this));
			this.bind('check-url', url_timer.reset.bind(url_timer));
		}

		this.render()
			.bind(this)
			.then(function() {
				if(this.model.is_new()) {
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
				this.check_url();

				this.track_subcontroller('file', function() {
					return new NotesEditFileController({
						inject: this.el_file,
						model: this.clone
					});
				}.bind(this));
				// track unsaved changes to the model
				this.form_data = this.el_form.toQueryString();

				setTimeout(this.resize_text.bind(this), 50);

				// basically copy tumblr's fixed footer tagging interface
				var footer_desc = function() {
					var tags = this.clone.get('tags').toJSON();
					if(tags.length) {
						this.view_state.footer_desc = tags.join(', ');
					} else {
						this.view_state.footer_desc = '';
					}
					this.render();
				}.bind(this);
				this.with_bind(this.clone.get('tags'), ['add', 'remove'], footer_desc);
				footer_desc();
			});

		if(this.modal) {
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
		} else {
			this.bind(['cancel', 'close'], this.release.bind(this));
		}

		// handle our "you have unsaved changes" state stuff
		var unsaved = function()
		{
			if(this.modal) {
				var set_back = false;
				if(this.modal.el.getElement('a[rel=back]')) {
					set_back = true;
				}
				this.modal.set_title(title + ' <strong>*</strong>', set_back && turtl.last_url);
			}
			if(!this.have_unsaved || !this.view_state.highlight_button) {
				this.have_unsaved = true;
				this.view_state.highlight_button = true;
				setTimeout(this.render.bind(this), 10);
			}
		}.bind(this);
		this.bind('unsaved', unsaved);
		this.with_bind(this.clone, 'change', unsaved);
		this.with_bind(this.clone.get('tags'), ['add', 'remove'], unsaved);
		this.with_bind(this.clone.get('file'), 'change', unsaved);

		this.with_bind(turtl.profile.get('boards'), ['add', 'remove', 'change'], this.render.bind(this));
		this.with_bind(turtl.events, 'profile:set-current-space', this.render.bind(this));
		this.with_bind(turtl.events, 'profile:set-current-space', this.check_url.bind(this));

		if(!this.skip_resize_text) {
			var resizer = this.resize_text.bind(this);
			window.addEvent('resize', resizer);
			this.bind('release', window.removeEvent.bind(window, 'resize', resizer));
		}
	},

	render: function()
	{
		var type = this.clone.get('type') || this.type;
		var colors = NOTE_COLORS;
		var data = this.clone.toJSON();
		if(!data.color) delete data.color;

		var boards = turtl.profile.space_boards()
			.map(function(b) { return b.toJSON(); })
			.sort(function(a, b) {
				return a.title.localeCompare(b.title);
			});

		// only send in note.board_id if the board_id is in the board list
		var board_exists = boards.filter(function(b) { return b.id == data.board_id; })[0];
		if(!board_exists) delete data.board_id;

		return this.html(view.render('notes/edit/index', {
			state: this.view_state,
			note: data,
			show_board_selector: !this.board_id,
			boards: boards,
			type: type,
			colors: colors
		}));
	},

	grab_form_data: function()
	{
		var space_id = turtl.profile.current_space().id();
		var board_id  = (this.inp_board ? this.inp_board.get('value') : this.board_id) || null;
		var title = this.inp_title.get('value');
		var url = this.inp_url && this.inp_url.get('value');
		var username = this.inp_username && this.inp_username.get('value');
		var password = this.inp_password && this.inp_password.get('value');
		var text = this.inp_text.get('value');

		var data = {
			space_id: space_id,
			board_id: board_id,
			title: title,
			url: url,
			username: username,
			password: password,
			text: text
		};
		return data;
	},

	submit: function(e) {
		if(e) e.stop();

		var data = this.grab_form_data();

		var clone = this.clone;
		clone.set(data);

		// grab the file binary, and clear it out from the model
		var file_set = clone.get('file').get('set');
		if(!file_set) {
			clone.unset('file');
		}

		return clone.save()
			.bind(this)
			.then(function() {
				this.model.set(clone.toJSON());
				var next = Promise.resolve();
				if(clone.get('file').get('cleared')) {
					this.model.get('file').clear();
					var tmpfile = new FileData({id: clone.id()});
					next = tmpfile.destroy();
				}
				this.have_unsaved = false;
				return next;
			})
			.then(function() {
				this.trigger('saved');
				this.trigger('close');
			})
			.catch(function(err) {
				turtl.events.trigger('ui-error', i18next.t('There was a problem updating that note'), err);
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
		this.view_state.text_height = height;
		this.render();
	},

	update_selected_id: function(e) {
		var board_id = this.inp_board.get('value');
		this.clone.set({board_id: board_id});
	},
});

