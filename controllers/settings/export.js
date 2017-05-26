var ExportController = Composer.Controller.extend({
	class_name: 'export',

	elements: {
		'input[name=enex]': 'inp_enex',
		'input[name=file]': 'inp_file',
		'.export .button': 'btn_export',
		'.export p.load': 'el_load_ex',
		'.import .button': 'btn_import',
		'.import p.load': 'el_load_im',
	},

	events: {
		'click section.export .button': 'run_export',
		'submit section.import form': 'run_import',
	},

	init: function()
	{
		turtl.push_title(i18next.t('Import/Export'), '/settings');

		this.render();
	},

	render: function()
	{
		this.html(view.render('settings/export', {}));
	},

	run_export: function(e)
	{
		if(e) e.stop();
		//var enex = this.inp_enex.matches(':checked');
		var enex = false;
		this.loading('export', true);
		turtl.profile.backup().bind(this)
			.then(function(data) {
				var errors = data.errors;
				delete data.errors;
				if(enex)
				{
					var backup = EvernoteExport.profile_to_evernote(data);
				}
				else
				{
					var backup = JSON.stringify(data, null, 2);
				}
				var blob = new Blob([backup], {type: 'application/json'});
				return download_blob(blob, {name: 'turtl-backup.'+(enex ? 'enex' : 'json')});
			})
			.catch(function(err) {
				turtl.events.trigger('ui-error', 'There was a problem backing up your profile', err);
				log.error('profile: export: ', derr(err));
			})
			.finally(function() {
				this.loading('export', false);
			});
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
			turtl.profile.restore(backup);
		}.bind(this)
		reader.readAsBinaryString(file);
	},

	loading: function(type, yesno) {
		fn = yesno ? 'addClass' : 'removeClass';
		if(type == 'export') {
			this.btn_export[fn]('disabled');
			this.el_load_ex[fn]('active');
		} else if(type == 'import') {
			this.btn_import[fn]('disabled');
			this.el_load_im[fn]('active');
		}
	},
});

