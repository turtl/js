var AddonComm	=	new Class({
	enabled: false,
	type: 'firefox',

	intialize: function()
	{
		if(window.addon && window.addon.port)
		{
			this.enabled	=	true;
			this.type		=	'firefox';
		}
	},

	send: function(ev)
	{
		if(!this.enabled) return false;

		var args	=	arguments.shift();
		switch(this.type)
		{
		default:
		case 'firefox':
			window.addon.port.emit.apply(window.addon.port.emit, [ev].append(args));
			break;
		}
	},

	bind: function(ev, cb)
	{
		if(!this.enabled) return false;

		switch(this.type)
		{
		default:
		case 'firefox':
			window.addon.port.on(ev, cb);
			break;
		}
	}
});

