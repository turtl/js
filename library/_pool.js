"use strict";

(function() {
	this.Pool = function(options)
	{
		options || (options = {});

		if(!options.create) throw new Error('Pool: options.create not given');
		if(!options.destroy) throw new Error('Pool: options.destroy not given');
		var max = options.size || 4;

		var free = [];
		var used = [];

		var size = function() { return free.length + used.length; };

		this.grab = function()
		{
			if(!free.length)
			{
				if(size() < max) free.push(options.create());
				else throw new Error('Pool: pool size exceeded');
			}
			var item = free.shift();
			used.push(item);
			return item;
		};

		this.release = function(item)
		{
			used = used.filter(function(i) { return i != item; });
			free.push(item);
		};

		this.destroy = function()
		{
			this.grab = function() {};
			this.release = function() {};
			[].concat(free).concat(used).forEach(function(item) {
				options.destroy(item);
			});
		}.bind(this);
	};
}).apply((typeof exports != 'undefined') ? exports : this);

