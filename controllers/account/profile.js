var AccountProfileController = Composer.Controller.extend({
	elements: {
	},

	events: {
	},

	init: function()
	{
		this.render();
	},

	release: function()
	{
		return this.parent.apply(this, arguments);
	},

	render: function()
	{
		var content	=	Template.render('account/profile', {
			size: turtl.profile.get('size', 0),
			storage: turtl.user.get('storage', 100 * 1024 * 1024)
		});
		this.html(content);
	}
});

