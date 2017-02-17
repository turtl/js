var Timer = Composer.Event.extend({
	options: {
		countdown: 5000
	},

	timeout: false,

	initialize: function(countdown, options)
	{
		options || (options = {});

		Object.keys(options).forEach(function(k) {
			this.options[k] = options[k];
		}.bind(this));
		this.options.countdown = countdown;
	},

	start: function()
	{
		if(this.timeout) return false;
		this.timeout = setTimeout(this.trigger.bind(this, 'fired'), this.options.countdown);
		return true;
	},

	stop: function()
	{
		if(!this.timeout) return false;
		clearTimeout(this.timeout);
		this.timeout = false;
		return true;
	},

	reset: function()
	{
		this.stop();
		this.start();
	}
});

