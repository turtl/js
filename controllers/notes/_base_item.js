var BaseNoteItem = Composer.Controller.extend({
	elements: {
		'ul.dropdown': 'dropdown_menu',
		'a.attachment': 'attachment'
	},

	events: {
		'click .actions a.menu': 'open_menu',
		'mouseleave ul.dropdown': 'close_menu',
		'mouseenter ul.dropdown': 'cancel_close_menu',
		'click .actions a.edit': 'open_edit',
		'click .actions a.move': 'open_move',
		'click .actions a.delete': 'delete_note',
		'click a.attachment': 'download_attachment'
	},

	menu_close_timer: null,

	init: function()
	{
		this.model.bind('change', this.render.bind(this), 'note:item:change:render');
		this.model.bind('destroy', this.release.bind(this), 'note:item:destroy:release');
		this.model.bind_relational('file', 'change', this.render.bind(this), 'note:file:encrypting');

		this.menu_close_timer = new Timer(200);
		this.menu_close_timer.end = this.do_close_menu.bind(this);
	},

	release: function()
	{
		this.model.unbind('change', 'note:item:change:render');
		this.model.unbind('destroy', 'note:item:destroy:release');
		this.model.unbind_relational('file', 'change', 'note:file:encrypting');
		this.menu_close_timer.end = null;
		this.parent.apply(this, arguments);
	},

	render: function(type, className)
	{
		var note_data = toJSON(this.model);
		if(!note_data.text && !note_data.url && !note_data.embed && note_data.file && note_data.file.blob_url && note_data.file.type.match(/^image/))
		{
			note_data.type = 'image';
			note_data.url = note_data.file.blob_url;
			note_data.file.blob_url = null;
		}

		var file = note_data.file || {};
		var ext = (file.name || '').replace(/^.*\./, '');
		var file_type = this.get_file_type(ext, {blank: true});
		var has_file = (file.hash || file.name || file.encrypting)
		var content = Template.render('notes/'+type+'/index', {
			note: note_data,
			has_file: has_file,
			file_type: file_type
		});
		content = view.make_links(content);
		this.html(content);
		// fix bad links in the note content
		this.el.getElements('.content a').each(function(el) {
			if(!el.href || !el.href.match(/^[a-z]+:/))
			{
				el.href = 'http://' + el.href;
			}
			el.target = '_blank';
		});
		if(has_file) className += ' file ';
		this.el.className = className + ' ' + note_data.type;

		// handle math junk
		this.render_math();
	},

	render_math: function()
	{
		// handle math junk
		var maths = this.el.getElements('pre.math');
		if(maths.length > 0)
		{
			maths.each(function(math) {
				// inject our mathjax script
				var equ = math.get('html').replace(/&amp;/g, '&');
				var script = new Element('script').setProperties({
					type: 'math/tex; mode=display'
				}).set('html', equ);
				script.inject(math, 'after');
				math.destroy();
			}, this);
			MathJax.Hub.Queue(['Process', MathJax.Hub, this.el, function() {
				if(this.board) this.board.get('notes').trigger('math-render');
			}.bind(this)]);
		}
	},

	open_menu: function(e)
	{
		if(e) e.stop();
		this.dropdown_menu.addClass('open');
	},

	do_close_menu: function()
	{
		this.dropdown_menu.removeClass('open');
	},

	close_menu: function(e)
	{
		this.menu_close_timer.start();
	},

	cancel_close_menu: function(e)
	{
		this.menu_close_timer.stop();
	},

	open_edit: function(e)
	{
		if(e) e.stop();
		new NoteEditController({
			board: this.board,
			note: this.model
		});
	},

	open_move: function(e)
	{
		if(e) e.stop();
		new NoteMoveController({
			board: this.board,
			note: this.model
		});
	},

	delete_note: function(e)
	{
		if(e) e.stop();
		if(confirm('Really delete this note FOREVER?!'))
		{
			turtl.loading(true);
			this.model.destroy({
				success: function() { turtl.loading(false); },
				error: function(_, err) {
					turtl.loading(false);
					barfr.barf('There was a problem deleting the note: '+ err);
				}
			});
		}
	},

	download_attachment: function(e)
	{
		if(e) e.stop();
		var atag = next_tag_up('a', e.target);
		if(atag.hasClass('decrypting')) return false;

		atag.addClass('decrypting');
		atag.setProperties({title: 'Decrypting, this can take a while.'});
		var icon = this.attachment.getElement('img');
		var icon_src = icon.src;
		icon.src = img('/images/site/icons/load_16x16.gif');
		this.model.get('file').to_blob({
			success: function(blob) {
				icon.src = icon_src;
				atag.removeClass('decrypting');
				atag.setProperties({title: ''});

				var url = URL.createObjectURL(blob);
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
					URL.revokeObjectURL(url);
					download.destroy();
				}).delay(5000, this);
			}.bind(this)
		});
	},

	// TODO: move somewhere more central
	get_file_type: function(ext, options)
	{
		options || (options = {});

		var known_file_types = {
			aac: 'aac',
			ai: 'ai',
			aiff: 'aiff',
			avi: 'avi',
			bmp: 'bmp',
			c: 'c',
			cpp: 'cpp',
			css: 'css',
			dat: 'dat',
			dmg: 'dmg',
			doc: 'doc',
			dotx: 'dotx',
			dwg: 'dwg',
			dxf: 'dxf',
			eps: 'eps',
			exe: 'exe',
			flv: 'flv',
			gif: 'gif',
			h: 'h',
			hpp: 'hpp',
			html: 'html',
			ics: 'ics',
			iso: 'iso',
			java: 'java',
			jpg: 'jpg',
			jpeg: 'jpg',
			key: 'key',
			mid: 'mid',
			mp3: 'mp3',
			mp4: 'mp4',
			mpg: 'mpg',
			odf: 'odf',
			ods: 'ods',
			odt: 'odt',
			otp: 'otp',
			ots: 'ots',
			ott: 'ott',
			pdf: 'pdf',
			php: 'php',
			png: 'png',
			ppt: 'ppt',
			psd: 'psd',
			py: 'py',
			qt: 'qt',
			rar: 'rar',
			rb: 'rb',
			rtf: 'rtf',
			sql: 'sql',
			tga: 'tga',
			tgz: 'tgz',
			tiff: 'tiff',
			txt: 'txt',
			wav: 'wav',
			xls: 'xls',
			xlsx: 'xlsx',
			xml: 'xml',
			yml: 'yml',
			zip: 'zip'
		};
		var type = known_file_types[ext];
		if(!type && options.blank) type = '_blank';
		return type;
	}
});
