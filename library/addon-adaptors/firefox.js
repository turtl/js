var FirefoxDesktopPort = new Class({
	initialize: function()
	{
	},

	send: function(ev, _)
	{
		var args = Array.prototype.slice.call(arguments, 1);
		var el = document.createElement('blast');
		el.setAttribute('data', JSON.stringify({ev: ev, args: args}));
		document.documentElement.appendChild(el);

		var evt = document.createEvent('Events');
		evt.initEvent('comm', true, false);
		el.dispatchEvent(evt);
	},

	bind: function(ev, cb)
	{

	},

	unbind: function()
	{

	}
});

