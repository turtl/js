var SettingsController = Composer.Controller.extend({
	xdom: true,
	class_name: 'settings',

	events: {
		'click a[href=#wipe]': 'wipe_data',
		'click a[href=#resend-confirmation]': 'resend_confirmation',
	},

	init: function()
	{
		this.with_bind(turtl.events, 'api:connect', this.render.bind(this));
		this.with_bind(turtl.events, 'api:disconnect', this.render.bind(this));
		this.with_bind(turtl.user, 'change:confirmed', this.render.bind(this));

		turtl.push_title(i18next.t('Your settings'));
		this.bind('release', turtl.pop_title.bind(null, false));

		this.render();
	},

	render: function()
	{
		var confirmed = turtl.user.get('confirmed');
		return this.html(view.render('settings/index', {
			connected: (turtl.sync || {}).connected,
			version: config.client + '-' + config.version,
			confirmed: confirmed,
		}));
	},

	wipe_data: function(e)
	{
		if(e) e.stop();

		var sync = new Sync();
		return sync.get_pending()
			.then(function(res) {
				var outgoing_msg = '';
				if(res.length > 0) {
					outgoing_msg = i18next.t(', however you have {{length}} changes waiting to be synced that will be lost if you do this', {length: res.length});
				}
				if(!confirm(i18next.t('This will erase all your local data and log you out. Your profile will be downloaded again next time you log in{{msg}}. Continue?', {msg: outgoing_msg}))) {
					return;
				}
				return sync.shutdown();
			})
			.then(function() {
				return turtl.user.logout();
			})
			.then(function() {
				return (new App()).wipe_app_data();
			})
			.catch(function(err) {
				turtl.events.trigger('ui-error', i18next.t('There was a problem clearing your profile'), err);
				console.log('err: ', err);
				log.error('settings: wipe db: ', derr(err));
			});
	},

	resend_confirmation: function(e)
	{
		if(e) e.stop();

		return turtl.user.resend_confirmation()
			.then(function() {
				barfr.barf(i18next.t('Confirmation email resent'));
			})
			.catch(function(err) {
				turtl.events.trigger('ui-error', i18next.t('There was a problem resending your confirmation email'), err);
				log.error('settings: resend confirm: ', derr(err));
			});
	}
});

