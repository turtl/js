var SettingsController = Composer.Controller.extend({
	init: function()
	{
		turtl.push_title('Your account');
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

