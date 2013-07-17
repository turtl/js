var NotificationsController = Composer.Controller.extend({
	elements: {
		'a.notifications': 'button',
		'div.notification-list': 'notification_list'
	},

	events: {
		'click a.notifications': 'open_notifications'
	},

	init: function()
	{
		this.render();

		var notifications = function()
		{
			tagit.messages.bind(['add', 'remove', 'reset'], this.msg_notify.bind(this), 'header_bar:monitor_messages');
			this.msg_notify();
		}.bind(this);

		if(tagit.user.logged_in)
		{
			notifications()
		}
		else
		{
			tagit.user.bind('login', function() {
				tagit.user.unbind('login', 'notifications:init:login');
				notifications();
			}, 'notifications:init:login');
		}
	},

	release: function()
	{
		tagit.messages.unbind(['add', 'remove', 'reset'], 'header_bar:monitor_messages');
		this.parent.apply(this, arguments);
	},

	render: function()
	{
		var notifications	=	tagit.messages.select({notification: true}).map(function(n) {
			return toJSON(n);
		});

		var content	=	Template.render('notifications/index', {
			notifications: notifications
		});
		this.html(content);
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
	},

	open_notifications: function(e)
	{
		if(e) e.stop();
		if(this.button.hasClass('sel'))
		{
			this.button.removeClass('sel');
			this.notification_list.removeClass('sel');
		}
		else
		{
			this.button.addClass('sel');
			this.notification_list.addClass('sel');
		}
	}
});
