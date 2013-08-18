var HeaderBarController = Composer.Controller.extend({
	inject: 'header',

	elements: {
		'ul.menu': 'menu',
		'div.apps': 'apps_container'
	},

	events: {
		'click a.menu': 'toggle_menu',
		'click li.bookmarklet a': 'bookmarklet',
		'click li.persona a': 'open_personas',
		'mouseenter ul.menu': 'cancel_close_menu',
		'mouseleave ul.menu': 'close_menu'
	},

	close_timer: null,
	notifications: null,

	init: function()
	{
		turtl.user.bind(['login', 'logout'], this.render.bind(this), 'header_bar:user:render');
		this.render();
		this.close_timer = new Timer(250);
		this.close_timer.end = function() {
			this.menu.removeClass('open');
		}.bind(this);
	},

	release: function()
	{
		turtl.user.unbind(['login', 'logout'], 'header_bar:user:render');
		if(this.notifications) this.notifications.release();
		this.close_timer.end = null;
		this.parent.apply(this, arguments);
	},

	render: function()
	{
		var content = Template.render('modules/header_bar', {
			user: toJSON(turtl.user)
		});
		this.html(content);

		if(this.notifications) this.notifications.release();
		this.notifications	=	new NotificationsController({inject: this.apps_container});
	},

	toggle_menu: function(e)
	{
		if(e) e.stop();
		if(this.menu.hasClass('open'))
		{
			this.menu.removeClass('open');
		}
		else
		{
			this.menu.addClass('open');
		}
	},

	close_menu: function(e)
	{
		this.close_timer.start();
	},

	cancel_close_menu: function(e)
	{
		this.close_timer.stop();
	},

	bookmarklet: function(e)
	{
		if(e) e.stop();
		alert('Drag me to your bookmarks!');
	},

	open_personas: function(e)
	{
		if(e) e.stop();
		new PersonasController();
	}
});
