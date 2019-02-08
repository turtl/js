var SettingsController = Composer.Controller.extend({
	xdom: true,
	class_name: 'settings',

	events: {
		'click a[href=#wipe]': 'wipe_data',
		'click a[href=#resend-confirmation]': 'resend_confirmation',
	},

	viewstate: {
		api_endpoint: null,
		extra: {},
	},

	init: function()
	{
		this.with_bind(turtl.events, 'sync:connected', this.render.bind(this));
		this.with_bind(turtl.user, 'change:confirmed', this.render.bind(this));
		this.with_bind(turtl.events, 'sync:outgoing:extra', function(extra) {
			this.viewstate.extra = extra;
		}.bind(this));
		this.with_bind(turtl.events, 'sync:incoming:extra', function(extra) {
			this.viewstate.extra = extra;
		}.bind(this));

		var last_route_non_settings = turtl.last_routes.slice(0).reverse()
			.filter(function(url) { return url.indexOf('/settings') < 0; })[0];
		turtl.push_title(i18next.t('Your settings'), last_route_non_settings || '/');
		this.bind('release', turtl.pop_title.bind(null, false));

		App.prototype.get_api_config()
			.bind(this)
			.then(function(config) {
				this.viewstate.api_endpoint = config.endpoint;
				this.render();
			});
		this.render();
	},

	render: function()
	{
		var confirmed = turtl.user.get('confirmed');
		var username = turtl.user.get('username');
		return this.html(view.render('settings/index', {
			connected: turtl.connected,
			version: config.client + '-' + config.version,
			confirmed: confirmed,
			username: username,
			state: this.viewstate,
		}));
	},

	wipe_data: function(e)
	{
		if(e) e.stop();

		var sync_collection = new SyncCollection();
		return sync_collection.get_pending()
			.then(function() {
				var res = sync_collection.toJSON();
				var outgoing_msg = '';
				if(res.length > 0) {
					outgoing_msg = i18next.t(', however you have {{length}} changes waiting to be synced that will be lost if you do this', {length: res.length});
				}
				if(!confirm(i18next.t('This will erase all your local data and log you out. Your profile will be downloaded again next time you log in{{msg}}. Continue?', {msg: outgoing_msg}))) {
					throw {skip: true};
				}
				return new Sync().shutdown(false);
			})
			.then(function() {
				return turtl.user.logout();
			})
			.then(function() {
				return (new App()).wipe_app_data();
			})
			.catch(function(e) { return e.skip === true; }, function() {
				// skipping, do nothing LOL.
				return;
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

