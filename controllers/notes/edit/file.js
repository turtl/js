var NotesEditFileController = Composer.Controller.extend({
	class_name: 'file clear',

	elements: {
		'input[name=file]': 'inp_file',
		'p': 'el_current'
	},

	events: {
		'change input[name=file]': 'set_attachment',
		'click a[rel=remove]': 'clear_attachment'
	},

	model: null,

	init: function()
	{
		if(!this.model) throw new Error('note: edit: file: bad model given');
		this.render();

		this.with_bind(this.model.get('file'), 'change', this.render.bind(this));
	},

	render: function()
	{
		var note = this.model.toJSON();
		var file = this.model.get('file').toJSON();
		this.html(view.render('notes/edit/file', {
			note_id: this.model.id(),		// id OR cid
			note: note,
			file: file
		}));
	},

	set_attachment: function(e)
	{
		var file = e.target.files[0];
		var reader = new FileReader();
		reader.onload = function(e)
		{
			// create a new file record with the binary file data
			var binary = e.target.result;

			// if the current note has an existing file, we're going to
			// overwrite it, otherwise create a new one
			this.model.get('file').set({
				set: true,		// lets us know we did change the file
				name: file.name,
				type: file.type,
				size: binary.length,
				data: binary
			}).unset('cleared', {silent: true});

			if(file.type.match(/^image\//))
			{
				var url = URL.createObjectURL(file);
				var img = new Image();
				img.onload = function() {
					this.model.get('file').set({meta: {width: img.width, height: img.height}});
					URL.revokeObjectURL(url);
				}.bind(this);
				img.src = url;
			}
		}.bind(this);
		reader.readAsBinaryString(file);
	},

	clear_attachment: function(e)
	{
		if(e) e.stop();
		this.model.get('file').clear().set({cleared: true});
	}
});

