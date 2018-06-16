var RememberMe = Composer.Event.extend({
	options: {},

	adapter: null,
	next_msg_id: 1,

	resmap: {},
	connected: false,

	initialize: function(adapter, options) {
		options || (options = {});
		Object.keys(options).forEach(function(key) {
			this.options[key] = options[key];
		}.bind(this));

		if(!RememberMe.adapters[adapter]) {
			throw new Error('RememberMe.adapters['+adapter+'] is missing, so core cannot be initialized.');
		}
		this.adapter = new RememberMe.adapters[adapter](options);

	},

	login: function() {
		if(!config.remember_me.enabled) { return Promise.resolve(); }
		return Promise.resolve(this.adapter.get_login())
			.then(function(logindata) {
				if(!logindata) return;
				return turtl.user.login_from_saved(logindata.user_id, logindata.key);
			})
			.catch(function(err) {
				log.warn('RememberMe.login() -- problem logging in from saved: ', err);
			});
	},

	save: function() {
		if(!config.remember_me.enabled) { return Promise.resolve(); }
		return Promise.resolve(turtl.user.save_login())
			.bind(this)
			.then(function(saved_login) {
				return this.adapter.save(saved_login.user_id, saved_login.key);
			});
	},

	clear: function() {
		if(!config.remember_me.enabled) { return Promise.resolve(); }
		return Promise.resolve(this.adapter.clear());
	},
});
RememberMe.adapters = {};

