var BoardsController = Composer.Controller.extend({
	inject: turtl.main_container_selector,

	init: function()
	{
		this.render();
	},

	render: function()
	{
		this.html('hai');
	}
});

