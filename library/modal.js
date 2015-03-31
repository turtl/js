var TurtlModal = Composer.Controller.extend({
	inject: 'body',

	elements: {
		'.turtl-modal': 'container',
		'header': 'header',
		'.modal-gutter': 'gutter'
	},

	events: {
		'click .turtl-modal > header h1 a[rel=back]': 'close_back'
	},

	is_open: false,

	show_header: false,
	title: '',
	actions: [],

	init: function()
	{
		this.render();

		this.bind('open', function() { this.is_open = true; }.bind(this));
		this.bind('close', function() { this.is_open = false; }.bind(this));
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

	open: function(element)
	{
		this.gutter.set('html', '');
		this.gutter.appendChild(element);

		setTimeout(function() {
			this.container.addClass('active');
			this.trigger('open');
		}.bind(this));
	},

	close: function()
	{
		if(!this.is_open) return;
		// slide out
		var html_copy = this.gutter.get('html');
		this.container.removeClass('active');
		this.trigger('close');
		this.gutter.set('html', html_copy).addClass('closing');
		(function() {
			this.gutter.set('html', '').removeClass('closing');
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
	}
});

