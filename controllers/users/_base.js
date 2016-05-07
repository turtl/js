var UserBaseController = FormController.extend({
	elements: {
		'input[name=autologin]': 'inp_autologin',
	},

	events: {
		'change input[name=autologin]': 'toggle_autologin'
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
		if(checked)
		{
			turtl.events.trigger('auth:add-auto-login');
		}
		else
		{
			turtl.events.trigger('auth:remove-auto-login');
		}
		localStorage['user:autologin'] = JSON.stringify(checked);
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
	}
});

