var NoteEditController = Composer.Controller.extend({
	elements: {
		'.note-edit form div.tags': 'tags',
		'textarea[name=quick]': 'inp_quick',
		'input[name=title]': 'inp_title',
		'input[name=url]': 'inp_url',
		'textarea[name=text]': 'inp_text',
		'.do-edit': 'editor',
		'.preview': 'preview',
		'div.markdown-tutorial': 'markdown_tutorial'
	},

	events: {
		'submit form': 'edit_note',
		'change .note-edit form input': 'save_form_to_copy',
		'change .note-edit form textarea': 'save_form_to_copy',
		'keyup .note-edit form input': 'save_form_to_copy',
		'keyup .note-edit form textarea': 'save_form_to_copy',
		'change .note-edit form select': 'save_form_to_copy',
		'click ul.type li': 'switch_type',
		'click .do-edit > input[name=preview]': 'open_preview',
		'click .preview > input[name=edit]': 'open_edit',
		'click a.markdown-tutorial': 'open_markdown_tutorial'
	},

	type_fields: {
		'quick':   ['quick'],
		'link':  ['url', 'title', 'text'],
		'text':  ['text'],
		'image': ['url', 'title', 'text']
	},

	edit_in_modal: true,
	show_tabs: true,

	board: null,
	note: null,
	note_copy: null,
	tag_controller: null,
	tips: null,

	init: function()
	{
		if(!this.board) return false;
		if(!this.note) this.note = new Note({type: 'quick'});
		// clone the note so any changes to it pre-save don't show up in the listings.
		this.note_copy = this.note.clone();
		this.render();
		if(this.edit_in_modal)
		{
			modal.open(this.el);
			var close_fn = function() {
				this.release();
				modal.removeEvent('close', close_fn);
			}.bind(this);
			modal.addEvent('close', close_fn);
		}
		turtl.keyboard.detach(); // disable keyboard shortcuts while editing
	},

	release: function()
	{
		if(this.note_copy)
		{
			this.note_copy.unbind();
			this.note_copy.get('tags').unbind();
			this.note_copy.clear();
			this.note_copy	=	null;
		}
		if(this.tag_controller) this.tag_controller.release();
		turtl.keyboard.attach(); // re-enable shortcuts
		if(this.tips) this.tips.detach();
		this.parent.apply(this, arguments);
	},

	render: function()
	{
		var content = Template.render('notes/edit', {
			note: toJSON(this.note_copy),
			board: toJSON(this.board),
			show_tabs: this.show_tabs
		});
		this.html(content);
		if(this.tips) this.tips.detach();
		this.tips = new TurtlTips(this.el.getElements('.tooltip'), {
			className: 'tip-container'
		});
		this.tag_controller = new NoteEditTagController({
			inject: this.tags,
			note: this.note_copy,
			board: this.board
		});
		this.select_tab(this.note_copy.get('type'));
	},

	save_form_to_copy: function(e, options)
	{
		options || (options = {});

		var note	=	options.note;
		if(!note) note = this.note_copy;

		if(note.get('type') == 'quick')
		{
			// do some basic guessing/intelligence stuff
			var val = this.inp_quick.get('value');
			if(val.match(/^[\w]+:\/\/([\.\-\w_\/:\?\+\&#=%,]+)$/i))
			{
				// its a URL
				if(val.match(/\.(jpg|jpeg|gif|png|tiff|bmp)([\w?&=#]+)?$/i))
				{
					// it's an image
					note.set({
						type: 'image',
						url: val
					});
				}
				else
				{
					// just a stupid link
					note.set({
						type: 'link',
						url: val
					});
				}
			}
			else
			{
				// only other option is text for now
				note.set({
					type: 'text',
					text: val,
				});
			}
			if(!options.set_type) note.set({type: 'quick'});
		}
		else
		{
			switch(note.get('type'))
			{
			case 'link':
				note.set({
					url: this.inp_url.get('value'),
					title: this.inp_title.get('value'),
					text: this.inp_text.get('value')
				});
				break;
			case 'image':
				note.set({
					url: this.inp_url.get('value'),
					title: this.inp_title.get('value'),
					text: this.inp_text.get('value')
				});
				break;
			case 'text':
			default:
				note.set({
					text: this.inp_text.get('value')
				});
				break;
			}
		}

		var inp_color = this.el.getElement('input[name=color]:checked');
		var color = null;
		if(inp_color) color = parseInt(inp_color.get('value'));
		if(color) note.set({color: color});
	},

	edit_note: function(e)
	{
		if(e) e.stop();

		this.save_form_to_copy(e, {set_type: true});

		var isnew	=	this.note_copy.is_new();
		if(!this.note_copy.get('board_id'))
		{
			this.note_copy.set({board_id: this.board.id()});
		}

		if(isnew)
		{
			this.note_copy.generate_key()
			this.note_copy.generate_subkeys([
				{b: this.board.id(), k: this.board.key}
			]);
		}

		// save the note copy, and on success, set the resulting data back into
		// the original note (not the copy)
		turtl.loading(true);
		this.note_copy.save({
			success: function() {
				turtl.loading(false);
				this.note.key = this.note_copy.key;
				var copy_json	=	this.note_copy.toJSON();
				copy_json.mod	=	Math.round(new Date().getTime() / 1000);
				this.note.set(copy_json);
				if(isnew) this.board.get('notes').add(this.note);
				// make sure the current filter applies to the edited note
				this.board.get('tags').trigger('change:selected');
				if(this.edit_in_modal) modal.close();
				else this.trigger('saved');
			}.bind(this),
			error: function(e) {
				barfr.barf('There was a problem saving your note: '+ e);
				turtl.loading(false);
			}
		});
	},

	select_tab: function(typename)
	{
		var types = this.el.getElements('.note-edit > form > .do-edit > div.type');
		types.each(function(el) { el.removeClass('sel'); });
		var enable = this.type_fields[typename];
		enable.each(function(type) {
			var type = this.el.getElement('.note-edit > form > .do-edit > div.type.'+ type);
			if(type) type.addClass('sel');
		}.bind(this));

		var lis = this.el.getElements('ul.type > li');
		lis.each(function(el) { el.removeClass('sel'); });
		var li = this.el.getElement('ul.type li.'+typename);
		if(li) li.addClass('sel');

		this.note_copy.set({type: typename});
		var input_sel = typename;
		if(['link','image'].contains(typename)) input_sel = 'url';
		var inp_el	=	this['inp_'+input_sel];
		if(inp_el)
		{
			inp_el.focus.delay(10, inp_el);
		}
		this.trigger('change-type', typename);
	},

	switch_type: function(e)
	{
		if(!e) return;
		e.stop();

		var li = next_tag_up('li', e.target);
		var typename = li.get('html').clean().toLowerCase();
		this.select_tab(typename);
		if(this.preview.getStyle('display') == 'block')
		{
			this.preview_note();
		}
	},

	open_preview: function(e)
	{
		if(e) e.stop();

		// height is used to keep jarring visuals down (by setting it into the
		// preview window)
		var height	=	this.editor.getCoordinates().height;

		this.preview.setStyles({
			display: 'block',
			minHeight: height
		});
		this.editor.setStyle('display', 'none');
		var html_el	=	this.preview.getElement('.html');

		// create a temp note and populate it woth our form data
		var preview_note	=	new Note({type: this.note_copy.get('type')});
		preview_note.generate_key();
		this.save_form_to_copy(null, {
			note: preview_note,
			set_type: true
		});
		var html	=	Template.render('notes/view/index', {
			note: toJSON(preview_note)
		});
		html_el.set('html', html);
		html_el.getElement('.actions').dispose();
		if(window.port) window.port.send('resize');
	},

	open_edit: function(e)
	{
		if(e) e.stop();
		this.preview.setStyle('display', '');
		this.editor.setStyle('display', '');
		if(window.port) window.port.send('resize');
	},

	open_markdown_tutorial: function(e)
	{
		if(e) e.stop();
		if(this.markdown_tutorial.getStyle('display') == 'block')
		{
			this.markdown_tutorial.setStyle('display', '');
		}
		else
		{
			this.markdown_tutorial.setStyle('display', 'block');
		}
		if(window.port) window.port.send('resize');
	}
});

