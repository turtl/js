var NoteBaseController = Composer.Controller.extend({
	xdom: true,
	elements: {
		'.backing a': 'img_a'
	},

	init: function()
	{
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
		renderopts || (renderopts = {});
		if(!renderopts.before_update) {
			renderopts.before_update = function(from, to) {
				if(!from.hasClass('task-list-item-checkbox')) return;
				from.set('checked', to.get('checked'));
			};
		}
		return this.parent(content, renderopts);
	},

	malformed_note: function(note) {
		var notedata = clone(note);
		note.type = 'text';
		note.title = i18next.t('Malformed note');
		note.text = i18next.t('This note was saved incorrectly and cannot be displayed.\n\n```\n{{-note_data}}\n```\n', {note_data: JSON.stringify(notedata, null, 2)});
	},
});

