var SyncController = Composer.Controller.extend({
	class_name: 'sync-settings',

	init: function()
	{
		this.render();
	},

	render: function()
	{
		this.html(view.render('sync/index'));
	}
});

