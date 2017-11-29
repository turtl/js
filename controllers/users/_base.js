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

	save_login: function()
	{
		if(!this.autologin()) return;
		var authdata = {
			uid: turtl.user.id(),
			key: tcrypt.key_to_string(turtl.user.key),
			auth: turtl.user.auth
		};
		turtl.events.trigger('auth:save-login', authdata);
	},

	persist_endpoint: function(endpoint) {
		if(!endpoint) return Promise.resolve();
		if(endpoint == this.viewstate.endpoint) return Promise.resolve();
		endpoint = endpoint.replace(/\/+$/, '');
		log.debug('user: persisting api url');
		localStorage.config_api_url = endpoint;
		this.viewstate.endpoint = endpoint;
		return App.prototype.set_api_endpoint(endpoint)
	},
});

