var HeaderBarController = Composer.Controller.extend({
	inject: 'header',

	elements: {
		'ul.menu': 'menu'
	},

	events: {
		'click a.menu': 'toggle_menu',
		'click li.bookmarklet a': 'bookmarklet',
		'mouseenter ul.menu': 'cancel_close_menu',
		'mouseleave ul.menu': 'close_menu'
	},

	close_timer: null,

	init: function()
	{
		tagit.user.bind(['login', 'logout'], this.render.bind(this), 'header_bar:user:render');
		this.render();
		this.close_timer = new Timer(250);
		this.close_timer.end = function() {
			this.menu.removeClass('open');
		}.bind(this);
	},

	release: function()
	{
		tagit.user.unbind(['login', 'logout'], 'header_bar:user:render');
		this.close_timer.end = null;
		this.parent.apply(this, arguments);
	},

	render: function()
	{
		var content = Template.render('modules/header_bar', {
			user: toJSON(tagit.user)
		});
		this.html(content);
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
	}
});
