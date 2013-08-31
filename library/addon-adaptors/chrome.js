var ChromeAddonPort	=	new Class({
	comm: false,

	initialize: function(options)
	{
		options || (options = {});

		// if a comm object was specified, use it instead of the background comm
		// object.
		if(options.comm) this.comm = options.comm;
	},

	_comm: function()
	{
		if(!this.comm) this.comm = chrome.extension.getBackgroundPage().comm;
		return this.comm;
	},

	send: function(ev)
	{
		this._comm().trigger.apply(this.comm.trigger, arguments);
	},

	bind: function(ev, cb)
	{
		this._comm().bind(ev, cb);
	},

	unbind: function(ev, cb)
	{
		this._comm().unbind(ev, cb);
	}
});

