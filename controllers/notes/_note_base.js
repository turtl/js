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

		// this triggers a change event that will re-render
		this.model.get('file').to_blob();
	}
});

