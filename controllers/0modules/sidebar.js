var SidebarController = Composer.Controller.extend({
	xdom: true,
	el: '#sidebar',

	elements: {
		'> .overlay': 'overlay',
		'li[rel=share]': 'el_share',
		'.inner .connection': 'el_connection'
	},

	events: {
		'click > .overlay': 'close',
		// close when clicking one of the sidebar links
		'click ul a': 'close',
		'click .sync .button.sync': 'sync'
	},

	is_open: false,

	init: function()
	{
		this.render();
		this.with_bind(turtl.events, 'sidebar:toggle', this.toggle.bind(this));
		this.with_bind(turtl.events, 'api:connect', this.render.bind(this));
		this.with_bind(turtl.events, 'api:disconnect', this.render.bind(this));
		this.with_bind(turtl.events, 'app:load:profile-loaded', this.render.bind(this));

		var refresh = setInterval(function() {
			if(this.is_open) this.render();
		}.bind(this), 5000);
		this.bind('release', clearInterval.bind(window, refresh));
	},

	render: function()
	{
		this.html(view.render('modules/sidebar', {
			connected: (turtl.sync || {}).connected,
			open: this.is_open,
			last_sync: (turtl.sync || {}).last_sync,
			polling: (turtl.sync || {})._polling
		}));
	},

	open: function()
	{
		this.is_open = true;
		document.body.addClass('settings');
		turtl.push_title(i18next.t('Turtl places'), false);
		setTimeout(this.render.bind(this), 10);
		turtl.events.trigger('sidebar:open');
	},

	close: function()
	{
		this.is_open = false;
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

	sync: function(e)
	{
		if(e) e.stop();
		if(!turtl.sync) return;
		turtl.sync.jumpstart();
		setTimeout(this.render.bind(this), 1000);
	}
});

