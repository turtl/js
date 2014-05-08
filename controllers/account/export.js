var AccountExportController = Composer.Controller.extend({
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
		var content	=	Template.render('account/export', {
		});
		this.html(content);
	}
});

