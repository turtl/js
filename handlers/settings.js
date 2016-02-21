var settings = {
	index: function()
	{
		var slide = false;
		if(turtl.controllers.pages.is([ChangePasswordController, DeleteAccountController, PersonasController, ExportController, ImportController]))
		{
			slide = 'right';
		}
		turtl.back.clear();
		turtl.controllers.pages.load(SettingsController, {}, {
			slide: slide
		});
	},

	password: function()
	{
		var slide = false;
		if(turtl.controllers.pages.is(SettingsController))
		{
			slide = 'left';
		}
		turtl.back.push(turtl.route.bind(turtl, '/settings'));
		turtl.controllers.pages.load(ChangePasswordController, {}, {
			slide: slide
		});
	},

	delete_account: function()
	{
		var slide = false;
		if(turtl.controllers.pages.is(SettingsController))
		{
			slide = 'left';
		}
		turtl.back.push(turtl.route.bind(turtl, '/settings'));
		turtl.controllers.pages.load(DeleteAccountController, {}, {
			slide: slide
		});
	},

	export: function()
	{
		var slide = false;
		if(turtl.controllers.pages.is(SettingsController))
		{
			slide = 'left';
		}
		turtl.back.push(turtl.route.bind(turtl, '/settings'));
		turtl.controllers.pages.load(ExportController, {}, {
			slide: slide
		});
	},

	import: function()
	{
		var slide = false;
		if(turtl.controllers.pages.is(SettingsController))
		{
			slide = 'left';
		}
		turtl.back.push(turtl.route.bind(turtl, '/settings'));
		turtl.controllers.pages.load(ImportController, {}, {
			slide: slide
		});
	}
};

