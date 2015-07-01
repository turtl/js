var LoadingController = Composer.Controller.extend({
	inject: 'body',

	elements: {
		'img': 'logo',
		'ul': 'log'
	},

	enabled: false,

	init: function()
	{
		this.render();

		this.with_bind(turtl.events, 'loading:show', function(show) {
			if(show) this.show();
			else this.hide();
		}.bind(this));
		this.with_bind(turtl.events, 'loading:log', this.do_log.bind(this));
		this.with_bind(turtl.events, 'loading:stop', function() {
			this.enabled = false;
			var imgs = this.el.getElements('p.animate > img');
			imgs.forEach(function(img) { img.removeClass('active'); });
		}.bind(this))
	},

	render: function()
	{
		this.html(view.render('modules/loading', {}));
		this.el.id = 'loading-overlay';
	},

	show: function()
	{
		this.enabled = true;
		this.el.addClass('show');
		var idx = 0;
		var imgs = this.el.getElements('p.animate > img');
		var do_animate = function()
		{
			if(!this.enabled) return false;
			if(idx >= imgs.length)
			{
				imgs.forEach(function(img) { img.removeClass('active'); });
				idx = 0;
			}
			else
			{
				imgs[idx].addClass('active');
				idx++;
			}
			setTimeout(do_animate, 750);
		}.bind(this)
		do_animate();
	},

	hide: function()
	{
		this.enabled = false;
		this.el.removeClass('show');
		this.do_log(false);
	},

	do_log: function(msg)
	{
		if(!msg) return this.log.set('html', '');
		var li = new Element('li');
		if(msg.inject)
		{
			msg.inject(li);
		}
		else
		{
			li.set('html', msg)
		}
		li.inject(this.log);
		setTimeout(function() { li.addClass('show'); }, 10);
	}
});

