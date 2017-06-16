var ExportController = Composer.Controller.extend({
	xdom: true,
	class_name: 'export-page',

	elements: {
		'input[name=enex]': 'inp_enex',
		'input[name=file]': 'inp_file',
		'.export p.load': 'el_load_ex',
		'.import p.load': 'el_load_im',
	},

	events: {
		'click section.export .button': 'run_export',
		'submit section.import form': 'run_import',
	},

	viewstate: {
		exporting: false,
		importing: false,
		import_count: 0,
	},

	init: function()
	{
		turtl.push_title(i18next.t('Import/Export'), '/settings');
		this.render();
	},

	render: function()
	{
		return this.html(view.render('settings/export', {
			state: this.viewstate,
		}), {ignore_children: [this.el_load_ex, this.el_load_im]});
	},

	run_export: function(e)
	{
		if(e) e.stop();
		if(this.viewstate.exporting) return;
		//var enex = this.inp_enex.matches(':checked');
		var enex = false;
		this.viewstate.exporting = true;
		this.render();
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
				this.viewstate.exporting = false;
				this.render();
			});
	},

	run_import: function(e)
	{
		if(e) e.stop();
		if(this.viewstate.importing) return;
		var file = this.inp_file.files[0];
		if(!file) return false;
		var action = this.el.getElement('.import input[name=action]:checked').get('value');
		var load_backup = function() {
			return new Promise(function(resolve, reject) {
				var error = function(e)
				{
					reject(e && e.target && e.target.error);
				}.bind(this);

				var reader = new FileReader();
				reader.onerror = error;
				reader.onabort = error;
				reader.onload = function(e) {
					// create a new file record with the binary file data
					var backup = e.target.result;

					log.debug('settings: import: read file: ', backup.length);
					if(backup.indexOf('<?xml') >= 0) {
						backup = EvernoteExport.evernote_to_profile(backup);
					} else {
						backup = JSON.parse(backup);
					}
					resolve(backup);
				};
				reader.readAsBinaryString(file);
			});
		};
		this.viewstate.importing = true;
		this.viewstate.import_count = 0;
		this.render();
		load_backup()
			.bind(this)
			.then(function(backup) {
				turtl.profile.bind('import:item', function(model) {
					this.viewstate.import_count++;
					this.render();
				}.bind(this), 'export:import:counter');
				return turtl.profile.restore(backup, {import_type: action});
			})
			.then(function() {
				barfr.barf(i18next.t('Import successful!'));
			})
			.catch(function(err) {
				log.error('settings: import: reader error: ', file, err);
				this.inp_file.set('value', '');
				barfr.barf('There was a problem reading that file: ' + err.message);
			})
			.finally(function() {
				turtl.profile.unbind('import:item', 'export:import:counter');
				this.viewstate.importing = false;
				this.render();
			});
	},
});

