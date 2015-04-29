var NoteBaseController = Composer.Controller.extend({
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
		if(this.model.get('type') != 'image') return;
		if(!this.model.get('file').get('hash')) return;

		var blob_url = this.model.get('file').get('blob_url');
		if(blob_url) return;

		// here we load the blob (which automatically sets file.blob_url), but
		// we silence it and pre-load the image. this reduces obnoxious flckering
		// when a bunch of images all load at once.
		this.model.get('file').to_blob({silent: true}).bind(this)
			.then(function() {
				var img = new Image();
				img.onload = function()
				{
					// ok, img loaded, NOW trigger the blob change events
					this.model.get('file').trigger('change:blob_url').trigger('change');
				}.bind(this);
				img.src = this.model.get('file').get('blob_url');
			});
	}
});

