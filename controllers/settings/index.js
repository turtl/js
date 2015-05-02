var SettingsController = Composer.Controller.extend({
	class_name: 'settings',

	init: function()
	{
		turtl.push_title('Your settings');
		this.bind('release', turtl.pop_title.bind(null, false));

		this.render();
	},

	render: function()
	{
		this.html(view.render('settings/index', {
			user: turtl.user.toJSON()
		}));
	}
});

