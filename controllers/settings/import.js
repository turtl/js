var ImportController = Composer.Controller.extend({
	class_name: 'export import',

	elements: {
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
		console.log('import');
	}
});

