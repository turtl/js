var UserBaseController = FormController.extend({
	elements: {
		'input[name=autologin]': 'inp_autologin',
	},

	events: {
		'change input[name=autologin]': 'toggle_autologin'
	},

	viewstate: {
		endpoint: '',
	},

	init: function()
	{
		this.parent();

		if(turtl.user.logged_in) return this.release();

		var autologin = JSON.parse(localStorage['user:autologin'] || 'false');
		if(autologin) turtl.events.trigger('auth:add-auto-login');
	},

	autologin: function()
	{
		return JSON.parse(localStorage['user:autologin'] || 'false');
	},

	toggle_autologin: function(e)
	{
		var checked = this.inp_autologin.getProperty('checked');
		localStorage['user:autologin'] = JSON.stringify(checked);
		if(checked)
		{
			turtl.events.trigger('auth:add-auto-login');
		}
		else
		{
			turtl.events.trigger('auth:remove-auto-login');
		}
	},

	toggle_settings: function(e) {
		if(e) e.stop();

		this.viewstate.settings = !this.viewstate.settings;
		this.render();
	},

	save_login: function()
	{
		if(!this.autologin()) return Promise.resolve();
		return turtl.core.send('user:get-login-token', "I understand this token contains the user's master key and their account may be compromised if the token is misplaced.")
			.then(function(token) {
				turtl.events.trigger('auth:save-login', token);
			});
	},

	persist_new_api: function(endpoint) {
		if(!endpoint) return Promise.resolve();
		endpoint = endpoint.replace(/\/+$/, '');
		log.debug('user: persisting api url');
		localStorage.config_api_url = endpoint;
		this.viewstate.endpoint = endpoint;
		return App.prototype.set_api_endpoint(endpoint)
	},

	persist_old_api: function(endpoint) {
		if(!endpoint) return Promise.resolve();
		endpoint = endpoint.replace(/\/+$/, '');
		log.debug('user: persisting old api url');
		localStorage.config_old_api_url = endpoint;
		this.viewstate.old_endpoint = endpoint;
		return App.prototype.set_old_api_endpoint(endpoint)
	},

	persist_endpoint: function(endpoint, old_endpoint) {
		return Promise.all([
			this.persist_new_api(endpoint),
			this.persist_old_api(old_endpoint),
		]);
	},
});

