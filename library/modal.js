var TurtlModal = Composer.Controller.extend({
	inject: 'body',

	class_name: 'turtl-modal',

	elements: {
		'header': 'header',
		'.modal-gutter': 'gutter'
	},

	events: {
		'click header h1 a[rel=back]': 'close_back',
		'click header': 'click_header'
	},

	is_open: false,

	show_header: false,
	title: '',
	actions: [],

	release_on_close: true,

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
	},

	render: function()
	{
		this.html(view.render('modules/modal', {
			show_header: this.show_header
		}));

		if(this.show_header)
		{
			this.track_subcontroller('header', function() {
				var con = new HeaderController({
					inject: this.header,
					bind_to: this,
					logo: false,
					actions: this.actions
				});
				con.render_title(this.title, turtl.last_url);
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
			this.trigger('open');
			document.body.className += ' modal';
		}.bind(this);
		if(options.immediate) do_open();
		else setTimeout(do_open);
	},

	close: function()
	{
		if(!this.is_open) return;
		// slide out
		var html_copy = this.gutter.get('html');
		this.el.removeClass('active');
		this.trigger('close');
		this.gutter.set('html', html_copy).addClass('closing');
		(function() {
			this.gutter.set('html', '').removeClass('closing');
			if(this.release_on_close) this.release();
			document.body.className = document.body.className.replace(/ modal/, '')
		}).delay(500, this);
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
	}
});

