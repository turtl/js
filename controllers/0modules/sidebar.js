var SidebarController = Composer.Controller.extend({
	el: '#sidebar',

	elements: {
		'> .overlay': 'overlay',
		'li[rel=share]': 'el_share',
		'.inner > .connection': 'el_connection'
	},

	events: {
		'click > .overlay': 'close',
		// close when clicking one of the sidebar links
		'click ul a': 'close'
	},

	init: function()
	{
		this.render();
		this.with_bind(turtl.events, 'sidebar:toggle', this.toggle.bind(this));
		var get_notify_el = function(type)
		{
			switch(type)
			{
			case 'share': return this.el_share; break;
			}
		}.bind(this);
		this.with_bind(turtl.events, 'api:connect', this.update_connection_status.bind(this));
		this.with_bind(turtl.events, 'api:disconnect', this.update_connection_status.bind(this));
		this.with_bind(turtl.events, 'app:load:profile-loaded', this.render.bind(this));
		this.with_bind(turtl.events, 'notification:set', function(type) {
			var el = get_notify_el(type);
			if(el) el.addClass('notify');
		});
		this.with_bind(turtl.events, 'notification:clear', function(type) {
			var el = get_notify_el(type);
			if(el) el.removeClass('notify');
		});
	},

	render: function()
	{
		this.html(view.render('modules/sidebar', {
			connected: (turtl.sync || {}).connected
		}));
	},

	open: function()
	{
		document.body.addClass('settings');
		turtl.push_title('Turtl places', false);
		setTimeout(this.overlay.addClass.bind(this.overlay, 'show'), 10);
		turtl.events.trigger('sidebar:open');
	},

	close: function()
	{
		this.overlay.setStyles({position: 'fixed'});
		this.overlay.removeClass('show');
		setTimeout(function() {
			this.overlay.setStyles({position: ''});
		}.bind(this), 300);
		document.body.removeClass('settings');
		turtl.pop_title('hubba hubba');
		turtl.events.trigger('sidebar:close');
	},

	toggle: function()
	{
		if(!turtl.user.logged_in) return;
		if(document.body.hasClass('settings'))
		{
			this.close();
		}
		else
		{
			this.open();
		}
	},

	update_connection_status: function()
	{
		var connected = turtl.sync.connected;
		if(connected)
		{
			this.el_connection
				.removeClass('disconnected')
				.addClass('connected');
		}
		else
		{
			this.el_connection
				.removeClass('connected')
				.addClass('disconnected');
		}
	}
});

