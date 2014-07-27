var NoteEditFileController = Composer.Controller.extend({
	elements: {
		'.upload-preview': 'upload_preview',
		'a.remove': 'upload_remove',
		'input[name=file]': 'inp_file'
	},

	events: {
		'change input[name=file]': 'set_attachment',
		'click a[href=#remove-attachment]': 'clear_attachment'
	},

	model: null,

	init: function()
	{
		if(!this.model) return false;
		this.render();

		this.model.bind_relational('file', 'change', this.render.bind(this), 'note:edit:file:change');
	},

	release: function()
	{
		this.model.unbind_relational('file', 'change', 'note:edit:file:change');
		var blob_url = this.model.get('file').get('blob_url');
		//if(blob_url) URL.revokeObjectURL(blob_url);
		this.parent.apply(this, arguments);
	},

	render: function()
	{
		var file = this.model.get('file');
		if(file && !file.get('blob_url') && file.get('type', '').match(/^image/))
		{
			file.to_blob({
				success: function(blob) {
					file.set({blob_url: URL.createObjectURL(blob)});
				}
			});
		}
		var content = Template.render('notes/edit_file', {
			file: toJSON(this.model.get('file')),
			blob_url: file.get('blob_url')
		});
		this.html(content);
		if(this.model.get('file').get('type'))
		{
			this.upload_remove.setStyle('display', 'inline');
		}
	},

	set_attachment: function(e)
	{
		var file = e.target.files[0];
		var reader = new FileReader();
		reader.onload = function(e)
		{
			// create a new file record with the binary file data
			var binary = e.target.result;

			var blob_url = this.model.get('file').get('blob_url');
			//if(blob_url) URL.revokeObjectURL(blob_url);

			// if the current note has an existing file, we're going to
			// overwrite it, otherwise create a new one
			this.model.get('file').set({
				set: true,		// lets us know we did change the file
				hash: false,
				name: file.name,
				type: file.type,
				data: binary,
				blob_url: null
			}, {silent: true}).unset('cleared');

			// update the preview window (if image)
			this.upload_remove.setStyle('display', 'inline');
			this.upload_preview.set('html', '');
			if(file.type.match(/^image\//))
			{
				this.model.get('file').set({blob_url: URL.createObjectURL(file)});
			}
			this.model.get('file').trigger('change');
		}.bind(this);
		reader.readAsBinaryString(file);
		this.upload_preview.set('html', 'Reading file...');
	},

	clear_attachment: function(e)
	{
		if(e) e.stop();
		this.inp_file.value = '';
		this.upload_remove.setStyle('display', '');
		this.upload_preview.set('html', '');
		var blob_url = this.model.get('file').get('blob_url');
		//if(blob_url) URL.revokeObjectURL(blob_url);
		this.model.get('file').clear().set({cleared: true});
	}
});

