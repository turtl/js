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

	init: function() {
		this.parent();

		if(turtl.user.logged_in) return this.release();

		var autologin = JSON.parse(localStorage['user:autologin'] || 'false');
	},

	autologin: function() {
		return JSON.parse(localStorage['user:autologin'] || 'false');
	},

	toggle_autologin: function(e)
	{
		var checked = this.inp_autologin.getProperty('checked');
		localStorage['user:autologin'] = JSON.stringify(checked);
		this.render();
	},

	toggle_settings: function(e) {
		if(e) e.stop();

		this.viewstate.settings = !this.viewstate.settings;
		this.render();
	},

	save_login: function() {
		if(!turtl.remember_me) return;
		if(!this.inp_autologin) return;
		var checked = this.inp_autologin.getProperty('checked');
		if(!checked) {
			return turtl.remember_me.clear();
		}
		return turtl.remember_me.save();
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

