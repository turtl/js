var HeaderBarController = Composer.Controller.extend({
	inject: 'header',

	elements: {
		'div.menu': 'menu',
		'div.apps': 'apps_container',
		'.size-container': 'size_container'
	},

	events: {
		'click a.menu': 'toggle_menu',
		'click a[href=#invite]': 'open_account',
		'click li.account a': 'open_account',
		'click li.persona a': 'open_personas',
		'click li.invites a': 'open_invites',
		'click li.wipe a': 'wipe_data',
		'mouseenter div.menu': 'cancel_close_menu',
		'mouseleave div.menu': 'close_menu'
	},

	close_timer: null,
	notifications: null,
	size_controller: null,

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
		if(this.size_controller) this.size_controller.release();
		this.close_timer.end = null;
		this.parent.apply(this, arguments);
	},

	render: function()
	{
		var content = Template.render('modules/header_bar', {
			user: toJSON(turtl.user)
		});
		this.html(content);

		if(this.size_controller) this.size_controller.release();
		this.size_controller = new AccountProfileSizeController({
			inject: this.size_container
		});

		if(!window._in_ext)
		{
			if(this.notifications) this.notifications.release();
			this.notifications = new NotificationsController({
				button: document.getElement('header h1'),
				inject: document.getElement('header')
			});
		}
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

	open_account: function(e)
	{
		if(e) e.stop();
		var invite = false;
		if(e.target && e.target.hasClass('invite')) invite = true;
		new AccountController({
			sub_controller_args: {open_inviter_on_init: invite}
		});
	},

	open_personas: function(e)
	{
		if(e) e.stop();
		new PersonasController();
	},

	open_invites: function(e)
	{
		if(e) e.stop();
		new InvitesListController({ edit_in_modal: true });
	},

	wipe_data: function(e)
	{
		if(e) e.stop();
		if(!confirm('Really wipe out local data and log out? All unsynced changes will be lost!')) return false;
		turtl.wipe_local_db({
			complete: function() {
				turtl.user.logout();
			}
		});
	}
});
