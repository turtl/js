var ExportController = Composer.Controller.extend({
	class_name: 'export',

	elements: {
	},

	events: {
		'click section.export .button': 'run_export',
		'submit section.import form': 'run_import'
	},

	init: function()
	{
		turtl.push_title('Backup/restore profile', '/settings');

		this.render();
	},

	render: function()
	{
		this.html(view.render('settings/export', {}));
	},

	run_export: function(e)
	{
		if(e) e.stop();
		turtl.profile.backup().bind(this)
			.then(function(data) {
				var backup = JSON.stringify(data, null, 2);
				var blob = new Blob([backup], {type: 'application/json'});
				return download_blob(blob, {name: 'backup.json'});
			})
			.catch(function(err) {
				turtl.events.trigger('ui-error', 'There was a problem backing up your profile', err);
				log.error('profile: export: ', derr(err));
			});
	},

	run_import: function(e)
	{
		if(e) e.stop();
		console.log('import');
	}
});

