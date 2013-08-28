var ChromeAddonPort	=	new Class({
	comm: false,

	initialize: function()
	{
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

