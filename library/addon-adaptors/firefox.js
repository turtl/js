var FirefoxAddonPort	=	new Class({
	comm: false,

	initialize: function(comm_object)
	{
		this.comm	=	comm_object;
	},

	send: function(ev)
	{
		var args	=	Array.clone(arguments);
		args.shift();
		this.comm.emit.apply(this.comm.emit, [ev].append(args));
	},

	bind: function(ev, cb)
	{
		this.comm.on(ev, cb);
	}
});

