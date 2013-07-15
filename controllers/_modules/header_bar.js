var HeaderBarController = Composer.Controller.extend({
	inject: 'header',

	elements: {
		'ul.menu': 'menu'
	},

	events: {
		'click a.menu': 'toggle_menu',
		'click li.bookmarklet a': 'bookmarklet',
		'click li.persona a': 'open_personas',
		'mouseenter ul.menu': 'cancel_close_menu',
		'mouseleave ul.menu': 'close_menu',
		'click div.apps a': 'select_app'
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

		var notifications = function()
		{
			tagit.messages.bind(['add', 'remove', 'change:unread', 'mark_read'], this.msg_notify.bind(this), 'header_bar:monitor_messages');
			this.msg_notify();
		}.bind(this);

		if(tagit.user.logged_in)
		{
			notifications()
		}
		else
		{
			tagit.user.bind('login', function() {
				notifications();
			});
		}
	},

	release: function()
	{
		tagit.user.unbind(['login', 'logout'], 'header_bar:user:render');
		tagit.messages.unbind(['add', 'remove', 'change:unread', 'mark_read'], 'header_bar:monitor_messages');
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
	},

	open_personas: function(e)
	{
		if(e) e.stop();
		new PersonasController();
	},

	select_app: function(e, name)
	{
		if(!e && name)
		{
			var a = this.el.getElement('.apps li a.'+name);
		}
		else
		{
			var a = next_tag_up('a', e.target);
		}
		if(!a) return false;
		this.el.getElements('.apps li a').each(function(el) { el.removeClass('sel'); });
		a.addClass('sel');
		return true;
	},

	msg_notify: function()
	{
		var num_unread	=	tagit.messages.select({unread: true}).length;
		if(num_unread > 0)
		{
			var notif	=	this.el.getElement('li a.messages small');
			if(notif) notif.destroy();
			var notif	=	new Element('small').set('html', num_unread+'');
			var a		=	this.el.getElement('li a.messages');
			if(!a) return;
			notif.inject(a);
		}
		else
		{
			var notif	=	this.el.getElement('li a.messages small');
			if(notif) notif.destroy();
		}
	}
});
