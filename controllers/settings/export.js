var ExportController = Composer.Controller.extend({
	xdom: true,
	class_name: 'export-page',

	elements: {
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
		turtl.push_title(i18next.t('Import &amp; export'), '/settings');
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
		this.viewstate.exporting = true;
		this.render();
		turtl.profile.export().bind(this)
			.then(function(data) {
				delete data.errors;
				var backup = JSON.stringify(data, null, 2);
				var blob = new Blob([backup], {type: 'application/json'});
				return download_blob(blob, {name: 'turtl-backup.json'});
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
					var backup = e.target.result;
					log.debug('settings: import: read file: ', backup.length);
					resolve(JSON.parse(backup));
				};
				reader.readAsText(file, 'UTF8');
			});
		};
		this.viewstate.importing = true;
		this.viewstate.import_count = 0;
		this.render();
		this.with_bind(turtl.events, 'profile:import:tally', function(count) {
			this.viewstate.import_count = count;
			this.render();
		}.bind(this), 'import:tally');
		load_backup()
			.bind(this)
			.then(function(exportdata) {
				return turtl.profile.import(action, exportdata);
			})
			.then(function() {
				barfr.barf(i18next.t('Successfully imported {{count}} items!', {count: this.viewstate.import_count}));
			})
			.catch(function(err) {
				log.error('settings: import: reader error: ', file, err);
				this.inp_file.set('value', '');
				barfr.barf('There was a problem reading that file: ' + err.message);
			})
			.finally(function() {
				this.viewstate.importing = false;
				this.render();
			});
	},
});

