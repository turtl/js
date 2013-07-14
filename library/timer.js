// timer class. you set timer.end to your callback function and then initialize it with
// a millisecond value. once started, it will count down the ms until 0, then run timer.end().
// it can be reset or stopped mid-countdown as well.
var Timer = new Class({
	// the callback function when a timer has successfully counted down
	end: function() {},

	initialize: function (ms, poll) {
		poll || (poll = 50);
		this.start_ms	=	0;
		this.ms			=	ms;
		this.is_started	=	false;
		this.poll		=	poll;
	},

	start: function () {
		d=new Date();
		this.start_ms	=	d.getTime();
		this.is_started	=	true;
		this.run.delay(this.poll, this);
	},

	run: function () {
		if(!this.is_started) return;
		d=new Date();
		t=d.getTime();
		
		if((t - this.start_ms) >= this.ms) {
			this.stop();
			if(this.end) this.end();
		} else {
			this.run.delay(this.poll, this);
		}
	},

	reset: function () {
		if(!this.is_started)
		{
			return this.start();
		}
		d=new Date();
		this.start_ms = d.getTime();
	},
	
	stop: function () {
		this.initialize(this.ms, this.name);
	}
});


