var UserBaseController = FormController.extend({
	elements: {
		'input[name=autologin]': 'inp_autologin',
		'input[name=old_server]': 'inp_old_server',
		'input[name=server]': 'inp_server',
		'input[name=proxy]': 'inp_proxy',
		'input[name=ignore-ssl]': 'inp_ignore_ssl',
	},

	events: {
		'change input[name=autologin]': 'toggle_autologin',
		'click a.open-settings': 'toggle_settings',
	},

	viewstate: {
		endpoint: '',
	},

	init: function() {
		this.parent();
		if(turtl.user.logged_in) return this.release();
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

	grab_login_settings: function(defaults) {
		var current_settings = {};
		try { current_settings = JSON.parse(localStorage['login_settings']); } catch(_) {}
		var ignore_ssl_default = false;
		if(typeof(current_settings.ignore_ssl) != 'undefined') {
			ignore_ssl_default = current_settings.ignore_ssl;
		} else if(typeof(defaults['ignore_ssl']) != 'undefined') {
			ignore_ssl_default = defaults['ignore_ssl'];
		}
		return {
			endpoint: current_settings.endpoint || localStorage['config_api_url'] || defaults['endpoint'],
			old_endpoint: current_settings.v6_endpoint || localStorage['config_old_api_url'] || defaults['old_endpoint'],
			proxy: current_settings.proxy || defaults['proxy'],
			ignore_ssl: ignore_ssl_default,
		};
	},

	populate_login_settings: function() {
		return App.prototype.get_api_config()
			.bind(this)
			.then(function(config) {
				const endpoint = config.endpoint;
				const old_endpoint = (config.v6 || {}).endpoint;
				const proxy = config.proxy || null;
				const ignore_ssl = config.allow_invalid_ssl || false;
				return this.grab_login_settings({
					endpoint: endpoint,
					old_endpoint: old_endpoint,
					proxy: proxy,
					ignore_ssl: ignore_ssl,
				});
			});
	},

	grab_form_login_settings: function() {
		const old_server = this.inp_old_server && this.inp_old_server.get('value').trim();
		const server = this.inp_server && this.inp_server.get('value').trim();
		const proxy = this.inp_proxy && this.inp_proxy.get('value').trim() || null;
		const ignore_ssl = this.inp_ignore_ssl && this.inp_ignore_ssl.get('checked') || false;
		return {
			endpoint: server,
			v6_endpoint: old_server,
			proxy: proxy,
			ignore_ssl: ignore_ssl,
		}
	},

	persist_login_settings: function(settings) {
		if(!settings) return Promise.resolve();
		const allowed = {
			'endpoint': {
				old_key: 'config_api_url',
				core_key: function(obj, val) { obj.endpoint = val; },
			},
			'v6_endpoint': {
				old_key: 'config_old_api_url',
				core_key: function(obj, val) {
					if(!obj.v6) obj.v6 = {};
					obj.v6.endpoint = val;
				},
			},
			'proxy': {
				format: function(s) {
					return s && s.replace(/^.*?([a-z]+:\/\/.*?:[0-9]+).*$/, '$1');
				},
				core_key: function(obj, val) { obj.proxy = val; },
			},
			'ignore_ssl': {
				format: function(v) { return !!v; },
				core_key: function(obj, val) { obj.allow_invalid_ssl = val; },
			},
		};
		var current_settings = {};
		try { current_settings = JSON.parse(localStorage['login_settings']); } catch(_) {}
		var save_settings = {};
		var core_settings = {};
		var promises = [];
		Object.keys(allowed).forEach(function(k) {
			const setting = allowed[k];
			// if a setting is missing, copy it from local before saving
			if(typeof(settings[k]) == 'undefined') {
				save_settings[k] = current_settings[k];
				if(!save_settings[k] && setting.old_key) {
					save_settings[k] = localStorage[setting.old_key];
				}
				return;
			}
			const val = setting.format ? setting.format(settings[k]) : settings[k];
			save_settings[k] = val;
			if(setting.core_key) {
				setting.core_key(core_settings, val);
			}
		});
		log.info('UserBaseController.persist_login_settings() -- persisting ', save_settings);
		localStorage['login_settings'] = JSON.stringify(save_settings);
		return App.prototype.set_api_config(core_settings);
	},
});

