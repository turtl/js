var NoteEditController = Composer.Controller.extend({
	elements: {
		'.note-edit .boards': 'board_container',
		'.note-edit form div.tags': 'tags',
		'.type.upload': 'uploader',
		'textarea[name=quick]': 'inp_quick',
		'input[name=title]': 'inp_title',
		'input[name=url]': 'inp_url',
		'textarea[name=text]': 'inp_text',
		'.do-edit': 'editor',
		'.preview': 'preview',
		'div.markdown-tutorial': 'markdown_tutorial',
		'input[type=submit]': 'inp_submit'
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
		'quick':   ['quick', 'upload'],
		'link':  ['url', 'title', 'text', 'upload'],
		'text':  ['text', 'upload'],
		'image': ['url', 'title', 'text', 'upload']
	},

	edit_in_modal: true,
	show_tabs: true,
	show_boards: false,
	track_last_board: false,

	board: null,
	note: null,
	note_copy: null,
	tag_controller: null,
	board_controller: null,
	tips: null,

	title: null,

	init: function()
	{
		if(this.board == 'last')
		{
			var board_id	=	turtl.user.get('settings').get_by_key('last_board').value() || false;
			var board		=	turtl.profile.get('boards').find_by_id(board_id);
			if(board) this.board = board;
			else this.board = turtl.profile.get_current_board();
			if(!this.board && turtl.profile.get('boards').models().length > 0)
			{
				this.board	=	turtl.profile.get('boards').first();
			}
		}

		if(!this.board)
		{
			return this.release();
		}

		if(!this.note) this.note = new Note({type: 'quick'});
		// clone the note so any changes to it pre-save don't show up in the listings.
		this.note_copy		=	new Note(toJSON(this.note));
		this.note_copy.key	=	this.note.key;
		this.note_copy.get('file').key	=	this.note.key;
		this.note_copy.get('file').set({blob_url: null});
		this.note_copy.disable_file_monitoring	=	true;

		this.render();
		if(this.edit_in_modal)
		{
			modal.open(this.el);
			modal.objects.container.removeClass('bare');
			var close_fn = function() {
				this.release();
				modal.removeEvent('close', close_fn);
			}.bind(this);
			modal.addEvent('close', close_fn);
		}
		turtl.keyboard.detach(); // disable keyboard shortcuts while editing

		// listen to board-change events
		if(this.board_controller)
		{
			this.board_controller.bind('change-board', function(board) {
				this.board	=	board;
				if(!this.board)
				{
					this.release();
					return;
				}
				this.render_tags();
			}.bind(this), 'notes:edit:change-board');
		}
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
		if(this.board_controller) this.board_controller.release();
		if(this.upload_controller) this.upload_controller.release();
		turtl.keyboard.attach(); // re-enable shortcuts
		if(this.tips) this.tips.detach();
		this.parent.apply(this, arguments);
	},

	render: function()
	{
		var content = Template.render('notes/edit', {
			title: this.title,
			note: toJSON(this.note_copy),
			board: toJSON(this.board),
			show_tabs: this.show_tabs
		});
		this.html(content);
		this.el.removeClass('no-modal');
		if(!this.edit_in_modal)
		{
			this.el.addClass('no-modal');
		}

		if(this.upload_controller) this.upload_controller.release();
		this.upload_controller	=	new NoteEditFileController({
			inject: this.uploader,
			model: this.note_copy
		});

		if(this.tips) this.tips.detach();
		this.tips = new TurtlTips(this.el.getElements('.tooltip'), {
			className: 'tip-container'
		});
		this.render_tags();
		if(this.show_boards)
		{
			var board	=	null;
			if(this.track_last_board) board = this.board;
			this.board_controller	=	new BoardsController({
				inject: this.board_container,
				profile: turtl.profile,
				add_bare: true,
				show_actions: false,
				switch_on_change: false,
				change_on_add: true,
				track_last_board: this.track_last_board,
				board: board
			});
		}
		this.select_tab(this.note_copy.get('type'));
		if(window.port) window.port.send('resize');

		// render our math example in the Formatting tutorial by hijacking a
		// note item controller.
		var note_controller	=	new NoteItemController({model: this.note});
		note_controller.el	=	this.el;
		note_controller.render_math();
		note_controller.el	=	null;
		note_controller.release();
	},

	render_tags: function()
	{
		if(this.tag_controller) this.tag_controller.release();
		this.tag_controller	=	new NoteEditTagController({
			inject: this.tags,
			note: this.note_copy,
			board: this.board
		});
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
			if(!this.note_copy.key) this.note_copy.generate_key()
			this.note_copy.generate_subkeys([
				{b: this.board.id(), k: this.board.key}
			]);
		}

		turtl.loading(true);
		this.inp_submit.disabled	=	true;

		var do_close	=	function()
		{
			turtl.loading(false);
			if(this.edit_in_modal) modal.close();
			else this.trigger('saved');
			if(window.port)
			{
				window.port.send('close');
				window.port.send('addon-controller-release');
			}
		}.bind(this);

		// grab the binary file data (and clear out the ref in the NoteFile)
		var file_bin	=	this.note_copy.get('file').get('data');
		this.note_copy.get('file').unset('data');

		var note_copy				=	new Note();
		note_copy.key				=	this.note_copy.key;
		// bit of a hack to copy the data over
		note_copy.data				=	this.note_copy.data;
		note_copy.relation_data		=	this.note_copy.relation_data;
		note_copy.get('file').key	=	this.note_copy.key;

		var file		=	note_copy.get('file');

		// get rid of the temporary blob URL
		URL.revokeObjectURL(file.get('blob_url'));
		file.unset('blob_url');

		if(!isnew && this.note_copy.get('file').get('cleared'))
		{
			note_copy.clear_files();
			note_copy.set({has_file: 0});
			file.clear()
			this.note_copy.get('file').clear()
			this.note.get('file').clear();
		}

		var file_set	=	file.get('set');
		if(isnew && file_set)
		{
			// let the view know we're encrypting, and remove the blob_url so it
			// doesn't try to display an image
			var setnote				=	this.note_copy.toJSON();
			delete setnote.file;
			this.note.set(setnote);
			this.note.set({file: toJSON(file)});
			this.note.get('file').set({encrypting: true}, {silent: true});

			// display a note stub to let the user know we're encrypting the
			// file
			this.board.get('notes').upsert(this.note, {allow_cid: true});
		}
		else if(file_set)
		{
			var filedata		=	toJSON(file);
			filedata.encrypting	=	true;
			this.note.get('file').set(filedata);
		}

		var do_note_save	=	function(options)
		{
			options || (options = {});

			// save the note copy, and on success, set the resulting data back into
			// the original note
			note_copy.save({
				// make sure we pass if we have a file or not
				success: function() {
					this.note.key	=	note_copy.key;
					var copy_json	=	note_copy.toJSON();
					copy_json.mod	=	Math.round(new Date().getTime() / 1000);
					if(file_set)
					{
						// manually set the file data and trigger a hash change
						// async, which forces the note to refresh its file
						// contents
						var copy_file	=	copy_json.file;
						delete copy_json.file;
						this.note.get('file').set(copy_file, {silent: true});
						(function() { this.note.get('file').trigger('change:hash'); }).delay(1, this);
					}
					this.note.set(copy_json);
					if(isnew && !file_set)
					{
						this.board.get('notes').upsert(this.note, {allow_cid: true});
					}
					// make sure the current filter applies to the edited note
					this.board.get('tags').trigger('change:selected');
					if(!options.no_close)
					{
						do_close();
					}
				}.bind(this),
				error: function(e) {
					this.inp_submit.disabled	=	false;
					barfr.barf('There was a problem saving your note: '+ e);
					turtl.loading(false);
				}
			});
		}.bind(this);

		if(file_set)
		{
			// we are uploading a new file! JOY!
			// we're going to actually serialize the file (encrypt it, dumbell)
			// BEFORE saving the note so we'll have the full file contents,
			// ready to post when we save the note. this saves us a lot of
			// heartache when actually running our syncing.
			file.unset('set');
			note_copy.clear_files({skip_remote_sync: true});
			var filedata	=	new FileData({data: file_bin});
			filedata.key	=	note_copy.key;
			filedata.toJSONAsync(function(res, hash) {
				// we now have the encrypted data + hash, set the hash as the
				// ID. note we're not setting it directly into filedata here,
				// instead we're setting it into the res object. this res object
				// is actually cached internally so that when filedata.toJSON()
				// is called, it will pull out this object instead of running
				// the serialization. this is so filedata.save() doesn't come up
				// empty when it calls toJSON().
				//
				// setting id here is a roundabout way of modifying the cache,
				// but it works great.
				res.id			=	hash;
				// we don't want to upload the file until the note we're
				// attaching to has a real ID
				res.synced		=	0;
				res.has_data	=	1;
				if(!note_copy.is_new())
				{
					res.note_id	=	note_copy.id();
					filedata.set({note_id: res.note_id});
				}
				filedata.set({id: hash});		// set the id for good measure

				// we're no longer encrypting
				file.unset('encrypting');
				this.note.get('file').unset('encrypting');

				// save the file contents into local db then save the note
				filedata.save({
					skip_remote_sync: note_copy.is_new(),
					success: function() {
						// give the note's file object a ref to the file's id
						var has_data	=	this.note.get('file').get('has_data', 0);
						file.set({hash: hash, has_data: has_data + 1});
						do_note_save({no_close: true});
					}.bind(this),
					error: function(e) {
						this.inp_submit.disabled	=	false;
						barfr.barf('There was a problem saving the attached file: '+ e);
						log.error('note: edit: file save: ', e);
						turtl.loading(false);
					}
				});
			}.bind(this));
			do_close();
		}
		else
		{
			// no file upload, I WANT THIS BY THE BOOK.
			do_note_save();
		}
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
			note: toJSON(preview_note),
			has_file: false,
			file_type: false
		});
		html_el.set('html', html);
		html_el.getElement('.actions').dispose();
		(function() {
			if(window.port) window.port.send('resize');
		}).delay(10, this);
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

