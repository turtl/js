var SyncController = Composer.Controller.extend({
	xdom: true,
	class_name: 'settings-sync content',

	init: function()
	{
		this.with_bind(turtl.events, 'api:connect', this.render.bind(this));
		this.with_bind(turtl.events, 'api:disconnect', this.render.bind(this));
		var inter = setInterval(this.render.bind(this), 5000);
		this.bind('release', function() { clearInterval(inter); });
		turtl.push_title(i18next.t('Sync info'), '/settings');

		this.render();
	},

	render: function()
	{
		return turtl.sync.get_unsynced()
			.bind(this)
			.then(function(unsynced) {
				return this.html(view.render('settings/sync', {
					unsynced: unsynced,
					connected: (turtl.sync || {}).connected,
				}));
			});
	}
});

