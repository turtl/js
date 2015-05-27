var SidebarController = Composer.Controller.extend({
	el: '#sidebar',

	elements: {
		'> .overlay': 'overlay'
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

