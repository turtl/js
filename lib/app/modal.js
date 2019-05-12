var TurtlModal = Composer.Controller.extend({
	inject: 'body',

	class_name: 'turtl-modal',

	elements: {
		'header': 'header',
		'.modal-gutter': 'gutter'
	},

	events: {
		'click header h1 a[rel=back]': 'close_back',
		'click header:not(a[rel=back])': 'click_header'
	},

	is_open: false,
	skip_overlay: false,
	skip_close_on_pageload: false,
	skip_body_class: false,
	context: null,

	show_header: false,
	show_back: true,
	title: '',
	actions: [],

	release_on_close: true,
	closefn: false,

	init: function()
	{
		this.render();

		this.bind('open', function() { this.is_open = true; }.bind(this));
		this.bind('close', function() { this.is_open = false; }.bind(this));

		var scroller = function()
		{
			this.trigger('scroll', this.el.scrollTop);
		}.bind(this);
		this.el.addEvent('scroll', scroller);
		this.bind('release', function() {
			if(this.el) this.el.removeEvent('scroll', scroller);
		}.bind(this));
		this.with_bind(turtl.user, 'logout', this.close.bind(this));

		if(!this.skip_close_on_pageload)
		{
			this.with_bind(turtl.controllers.pages, 'load', this.close.bind(this));
		}

		this.with_bind(this.context || turtl.keyboard, 'esc', this.close.bind(this));
	},

	render: function()
	{
		this.html(view.render('modules/modal', {
			show_header: this.show_header
		}));

		this.render_header();
	},

	render_header: function()
	{
		if(this.show_header)
		{
			this.track_subcontroller('header', function() {
				var con = new HeaderController({
					inject: this.header,
					bind_to: this,
					logo: false,
					actions: this.actions
				});
				con.render_title(this.title, this.show_back ? turtl.last_url : null);
				con.set_actions(this.actions);
				return con;
			}.bind(this));
		}
		else
		{
			var con = this.get_subcontroller('header');
			if(con) con.release();
		}
	},

	open: function(element, options)
	{
		options || (options = {});

		this.gutter.set('html', '');
		this.gutter.appendChild(element);

		var do_open = function()
		{
			this.el.addClass('active');
			this.gutter.addClass('opening');
			(function() {
				this.gutter.removeClass('opening');
			}).delay(300, this);
			this.trigger('open');
			if(!this.skip_body_class)
			{
				document.body.className += ' modal';
			}
			turtl.back.push(this.close.bind(this), this.cid());
		}.bind(this);
		if(options.immediate) do_open();
		else setTimeout(do_open, 5);

		if(!this.skip_overlay)
		{
			turtl.events.trigger('overlay:open', this.close.bind(this));
		}
	},

	close: function(options)
	{
		options || (options = {});

		if(!this.is_open) return false;
		if(this.closefn && !this.closefn()) return false;
		this.closefn = false;

		// slide out
		var html_copy = this.gutter.get('html');
		this.el.removeClass('active');
		this.trigger('close');
		this.gutter.set('html', html_copy).addClass('closing');
		turtl.back.pop(this.cid());
		(function() {
			this.gutter.set('html', '').removeClass('closing');
			if(this.release_on_close) this.release();
			if(!this.skip_body_class)
			{
				document.body.className = document.body.className.replace(/ modal/, '')
			}
		}).delay(500, this);

		if(!options.from_overlay && !this.skip_overlay)
		{
			turtl.events.trigger('overlay:nop');
		}
		return true;
	},

	close_back: function(e)
	{
		if(e) e.stop();
		this.close();
	},

	set_title: function(title, backurl)
	{
		var headercon = this.get_subcontroller('header');
		if(!headercon) return;
		headercon.render_title(title, backurl);
	},

	click_header: function(e)
	{
		this.trigger('click-header', e);
	},

	scroll_to: function(el)
	{
		if(!el) return;
		var y = el.getCoordinates().top;
		y -= this.header.getCoordinates().height;
		(new Fx.Scroll(this.el, {duration: 300})).start(0, y);
	}
});

