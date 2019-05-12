const NoteBaseController = Composer.Controller.extend({
	xdom: true,
	elements: {
		'.backing a': 'img_a'
	},

	embed_notes: false,
	embed_timer: null,

	init: function()
	{
		if(this.embed_notes) {
			this.embed_timer = new Timer(50);
			this.with_bind(this.embed_timer, 'fired', this.update_embeds.bind(this));
		}
		this.with_bind(this.model, 'change', this.update_preview.bind(this));
		this.with_bind(this.model.get('file'), 'change', this.update_preview.bind(this));
		this.update_preview();
	},

	update_preview: function()
	{
		var file = this.model.get('file');
		if(this.model.get('type') != 'image') return;
		if(!file.id(true)) return;
		if(file.get('no_preview')) return;

		var blob_url = file.get('blob_url');
		if(blob_url) return;

		// here we load the blob (which automatically sets file.blob_url), but
		// we silence it and pre-load the image. this reduces obnoxious flckering
		// when a bunch of images all load at once.
		file.has_data().bind(this)
			.then(function(res) {
				if(!res) return;
				return file.to_blob({silent: true}).bind(this)
					.then(function() {
						var img = new Image();
						img.onload = function()
						{
							// ok, img loaded, NOW trigger the blob change events
							file.trigger('change:blob_url').trigger('change');
						}.bind(this);
						img.src = file.get('blob_url');
					})
			})
			.catch(function(err) {
				if(err.in_progress) return;
				throw err;
			});
	},

	html: function(content, renderopts) {
		// embed notes (pre). we're going to take all note::<noteid> refs and
		// replace them with divs that we render note subcontrollers into.
		if(this.embed_notes) {
			content = content.replace(/\bnote::[0-9a-f]+\b/g, function(match) {
				const note_id = match.replace(/^.*:([0-9a-z]+)$/, '$1');
				return '<div class="embed-note-container" rel="note-'+note_id+'"></div>';
			});
		}

		// fix checkbox rendering
		renderopts || (renderopts = {});
		if(!renderopts.before_update) {
			renderopts.before_update = function(from, to) {
				if(!from.hasClass('task-list-item-checkbox')) return;
				from.set('checked', to.get('checked'));
			};
		}

		return this.parent(content, renderopts)
			.bind(this)
			.tap(function() {
				if(!this.embed_notes) return;
				// ok, finish processing embedded notes
				this.embed_timer.reset();
			});
	},

	malformed_note: function(note) {
		var notedata = clone(note);
		note.type = 'text';
		note.title = i18next.t('Malformed note');
		note.text = i18next.t('This note was saved incorrectly and cannot be displayed.\n\n```\n{{-note_data}}\n```\n', {note_data: JSON.stringify(notedata, null, 2)});
	},

	update_embeds: function() {
		const embed_promises = this.el.getElements('.embed-note-container')
			.map(function(embed_el) {
				const note_id = embed_el.get('rel').replace(/^note-/, '');
				const note = new Note({id: note_id});
				return note.fetch();
			});
		return Promise.all(embed_promises)
			.bind(this)
			.then(function(notes) {
				if(!this.el) return;
				// remove any previously embedded notes before rendering
				if(this._num_last_embeds && this._num_last_embeds > 0) {
					for(var i = notes.length - 1; i < this._num_last_embeds; i++) {
						this.remove('embed-'+i);
					}
				}
				this._num_last_embeds = notes.length;
				notes.forEach(function(note, i) {
					const embed_div = this.el.getElement('.embed-note-container[rel=note-'+note.id()+']');
					if(!embed_div) return;
					if(!note.is_loaded()) {
						// 404, just replace the embed text back in
						embed_div.set('html', 'note::'+note.id());
						return;
					}
					this.sub('embed-'+i, function() {
						const con = new NotesEmbedController({
							inject: embed_div,
							model: note,
							// don't open embedded notes if we're in a list item
							prohibit_open: (this instanceof NotesItemController),
						});
						// cleanup...
						con.bind('release', function() {
							note.destroy({skip_remote_sync: true});
						});
						return con;
					}.bind(this));
				}.bind(this));
				this.trigger('update');
			});
	},
});

