var ExportController = Composer.Controller.extend({
	class_name: 'export',

	elements: {
		'input[name=enex]': 'inp_enex'
	},

	events: {
		'click section.export .button': 'run_export',
	},

	init: function()
	{
		turtl.push_title('Export', '/settings');

		this.render();
	},

	render: function()
	{
		this.html(view.render('settings/export', {}));
	},

	run_export: function(e)
	{
		if(e) e.stop();
		var enex = this.inp_enex.matches(':checked');
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
				return download_blob(blob, {name: 'backup.'+(enex ? 'enex' : 'json')});
			})
			.catch(function(err) {
				turtl.events.trigger('ui-error', 'There was a problem backing up your profile', err);
				log.error('profile: export: ', derr(err));
			});
	}
});

