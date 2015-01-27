var NotificationsController = Composer.Controller.extend({
	elements: {
		'div.notification-list': 'notification_list'
	},

	events: {
		'click a.accept': 'accept',
		'click a.deny': 'deny'
	},

	check_close: null,
	is_open: false,
	button: null,

	init: function()
	{
		var notifications = function()
		{
			if(!turtl.messages || !turtl.invites) return false;

			this.render();
			turtl.messages.bind(['add', 'remove', 'reset'], function() {
				this.render()
				this.msg_notify();
			}.bind(this), 'header_bar:monitor_messages');
			turtl.invites.bind(['add', 'remove', 'reset'], function() {
				this.render()
				this.msg_notify();
			}.bind(this), 'header_bar:monitor_invites');
			this.msg_notify();

			/*
			this.check_close = function(e) {
				if(!e || !e.page) return;
				if(!this.notification_list.hasClass('sel')) return;
				var coords = this.notification_list.getCoordinates();
				if((e.page.x < coords.left || e.page.x > coords.right || e.page.y < coords.top || e.page.y > coords.bottom))
				{
					this.open_notifications();	// it SAYS open but it's actually going to close
				}
			}.bind(this);
			document.addEvent('click', this.check_close);
			*/
		}.bind(this);

		this._open_list = this.open_notifications.bind(this);
		if(this.button) this.button.addEvent('click', this._open_list);

		if(turtl.user.logged_in)
		{
			notifications()
		}
		else
		{
			turtl.user.bind('login', function() {
				turtl.user.unbind('login', 'notifications:init:login');
				// delay in case this handler runs before turtl.messages is created
				(function() { notifications(); }).delay(10, this);
			}, 'notifications:init:login');
		}
	},

	release: function()
	{
		turtl.messages.unbind(['add', 'remove', 'reset'], 'header_bar:monitor_messages');
		turtl.invites.unbind(['add', 'remove', 'reset'], 'header_bar:monitor_invites');
		if(this.button) this.button.removeEvent('click', this._open_list);
		if(this.check_close) $(document).removeEvent('click', this.check_close);
		this.parent.apply(this, arguments);
	},

	render: function()
	{
		/*
		var notifications = turtl.messages.select({notification: true}).map(function(n) {
			return toJSON(n);
		});

		var content = Template.render('notifications/index', {
			notifications: notifications,
			invites: toJSON(turtl.invites),
			is_open: this.is_open,
		});
		this.html(content);
		*/
	},

	msg_notify: function()
	{
		if(!this.button) return;
		var num_unread = turtl.messages.select({notification: true}).length;
		num_unread		+=	turtl.invites.models().length;
		if(num_unread > 0)
		{
			var notif = this.button.getElement('small');
			this.button.addClass('active');
			if(notif) notif.destroy();
			var notif = new Element('small').set('html', (num_unread+'').safe());
			notif.inject(this.button);
		}
		else
		{
			var notif = this.button.getElement('small');
			if(notif) notif.destroy();
			this.button.removeClass('active');
		}
	},

	open_notifications: function(e)
	{
		if(e) e.stop();
		if(!this.button.hasClass('active')) return false;

		new InvitesListController({ edit_in_modal: true });

		/*
		if(e) e.stop();
		if(this.button.hasClass('sel'))
		{
			this.button.removeClass('sel');
			this.notification_list.removeClass('sel');
			this.is_open = false;
		}
		else
		{
			this.button.addClass('sel');
			this.notification_list.addClass('sel');
			this.is_open = true;
		}
		*/
	},

	get_notification_id_from_el: function(el)
	{
		return next_tag_up('li', next_tag_up('li', el).getParent()).className.replace(/^.*notification_([0-9a-f-]+).*?$/, '$1');
	},

	accept: function(e)
	{
		if(!e) return false;
		e.stop();
		var nid = this.get_notification_id_from_el(e.target);
		var message = turtl.messages.find_by_id(nid);
		if(!message) return;

		var body = message.get('body');
		switch(body.type)
		{
		case 'share_board':
			var board_id = body.board_id;
			var board_key = tcrypt.key_to_bin(body.board_key);
			var persona = turtl.user.get('personas').find_by_id(message.get('to'));
			if(!persona) return false;
			// this should never happen, but you never know
			if(!board_id || !board_key) persona.delete_message(message);
			var board = new Board({
				id: board_id
			});
			board.key = board_key;
			turtl.loading(true);
			board.accept_share(persona).bind(this)
				.then(function() {
					// removeing the message from turtl.messages isn't necessary,
					// but is less visually jarring since otherwise we'd have to
					// wait for a sync to remove it
					turtl.messages.remove(message);

					// actually delete the message
					persona.delete_message(message);
					barfr.barf('Invite accepted!');
				})
				.catch(function(err) {
					log.error('error: invite: accept: ', err);
					barfr.barf('There was a problem accepting the invite: '+ err);
				})
				.finally(function() {
					turtl.loading(false);
				});
			break;
		default:
			return false;
			break;
		}
	},

	deny: function(e)
	{
		if(!e) return false;
		e.stop();
		var nid = this.get_notification_id_from_el(e.target);
		var message = turtl.messages.find_by_id(nid);
		if(!message) return;

		var body = message.get('body');
		switch(body.type)
		{
		case 'share_board':
			var board_id = body.board_id;
			var persona = turtl.user.get('personas').find_by_id(message.get('to'));
			if(!persona) return false;
			turtl.loading(true);
			persona.delete_message(message).bind(this)
				.finally(function() { turtl.loading(false); });
			break;
		default:
			return false;
			break;
		}
	}
});
