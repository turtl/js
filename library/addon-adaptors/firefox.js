var FirefoxAddonPort	=	new Class({
	comm: false,

	initialize: function(comm_object)
	{
		this.comm	=	comm_object;
	},

	send: function(ev, args)
	{
		this.comm.emit.apply(this.comm.emit, arguments);
	},

	bind: function(ev, cb)
	{
		this.comm.on(ev, cb);
	},

	unbind: function()
	{
		this.comm.removeListener.apply(this.comm, arguments);
	}
});

