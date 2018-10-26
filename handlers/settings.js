handlers.settings = {
	index: function()
	{
		var slide = false;
		if(turtl.controllers.pages.is([ChangePasswordController, DeleteAccountController, SyncController, FeedbackController, LogsController]))
		{
			slide = 'right';
		}
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

	sync: function()
	{
		var slide = false;
		if(turtl.controllers.pages.is(SettingsController))
		{
			slide = 'left';
		}
		turtl.back.push(turtl.route.bind(turtl, '/settings'));
		turtl.controllers.pages.load(SyncController, {}, {
			slide: slide
		});
	},

	export: function() {
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

	logs: function() {
		var slide = false;
		if(turtl.controllers.pages.is(SettingsController)) {
			slide = 'left';
		}
		turtl.back.push(turtl.route.bind(turtl, '/settings'));
		turtl.controllers.pages.load(LogsController, {}, {
			slide: slide
		});
	},

	feedback: function() {
		var slide = false;
		if(turtl.controllers.pages.is(SettingsController)) {
			slide = 'left';
		}
		turtl.back.push(turtl.route.bind(turtl, '/settings'));
		turtl.controllers.pages.load(FeedbackController, {}, {
			slide: slide
		});
	},
};

