var ImportController = Composer.Controller.extend({
	class_name: 'export import',

	elements: {
		'input[name=file]': 'inp_file'
	},

	events: {
		'submit section.import form': 'run_import'
	},

	init: function()
	{
		turtl.push_title('Import', '/settings');

		this.render();
	},

	render: function()
	{
		this.html(view.render('settings/import', {}));
	},

	run_import: function(e)
	{
		if(e) e.stop();
		var file = this.inp_file.files[0];
		if(!file) return false;
		var reader = new FileReader();
		var error = function(e)
		{
			log.error('settings: import: reader error: ', file, e.target.error);
			this.inp_file.set('value', '');
			barfr.barf('There was a problem reading that file: ' + e.target.error.message);
		}.bind(this);

		reader.onerror = error;
		reader.onabort = error;
		reader.onload = function(e)
		{
			// create a new file record with the binary file data
			var backup = e.target.result;

			log.debug('settings: import: read file: ', backup.length);
			if(backup.indexOf('<?xml') >= 0)
			{
				backup = EvernoteExport.evernote_to_profile(backup);
			}
			else
			{
				backup = JSON.parse(backup);
			}
			// TODO: import w/ boards and tags
			var tags = [];
			var boards = [];
			turtl.profile.import(backup, {boards: boards, tags: tags});
		}.bind(this)
		reader.readAsBinaryString(file);
	}
});

