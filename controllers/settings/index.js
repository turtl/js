var SettingsController = Composer.Controller.extend({
	class_name: 'settings',

	events: {
		'click a[href=#wipe]': 'wipe_data'
	},

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
	},

	wipe_data: function(e)
	{
		if(e) e.stop();

		if(!confirm('This will erase all your local data and log you out. Your profile will be downloaded again next time you log in. Continue?')) return;
		turtl.wipe_local_db()
			.then(function() { return turtl.user.logout(); })
			.catch(function(err) {
				turtl.events.trigger('ui-error', 'There was a problem clearing your profile', err);
				log.error('settings: wipe db: ', derr(err));
			});
	}
});

