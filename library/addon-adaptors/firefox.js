var FirefoxAddonPort	=	new Class({
	comm: false,

	initialize: function(comm_object)
	{
		this.comm	=	comm_object;
		for(key in comm_object)
		{
			var val = comm_object[key];
			if(typeof val == 'function')
			{
				console.log('['+key+']: ', val);
			}
		}
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

