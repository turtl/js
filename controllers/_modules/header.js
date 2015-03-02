var HeaderController = Composer.Controller.extend({
	inject: 'header',

	events: {
		'click a.logo': 'toggle_sidebar'
	},

	init: function()
	{
		this.render();
	},

	render: function()
	{
		this.html(view.render('modules/header', {
			logged_in: turtl.user.logged_in
		}));
	},

	toggle_sidebar: function(e)
	{
		if(e) e.stop();
		turtl.events.trigger('sidebar:toggle');
	}
});

