var SidebarController = Composer.Controller.extend({
	el: '#sidebar',

	elements: {
		'> .overlay': 'overlay',
		'li[rel=share]': 'el_share'
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
		this.with_bind(turtl.events, 'notification:set', function(type) {
			var el = get_notify_el(type);
			console.log('el: ', el);
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
	}
});

