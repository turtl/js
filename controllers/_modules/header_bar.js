var HeaderBarController = Composer.Controller.extend({
	inject: 'header',

	elements: {
		'a.menu': 'btn_menu',
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
		'click li.wipe a': 'wipe_data'
	},

	notifications: null,
	size_controller: null,

	_do_close: null,

	init: function()
	{
		this._do_close = function(e)
		{
			console.log('e: ', e);
			if(e.direction && e.direction != 'left') return;
			if(e.type == 'click' && Composer.find_parent('div.menu', e.target)) return;
			this.toggle_menu();
		}.bind(this);

		turtl.user.bind(['login', 'logout'], this.render.bind(this), 'header_bar:user:render');
		this.render();
	},

	release: function()
	{
		turtl.user.unbind(['login', 'logout'], 'header_bar:user:render');
		if(this.notifications) this.notifications.release();
		if(this.size_controller) this.size_controller.release();
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
		if(document.body.hasClass('settings'))
		{
			document.body.removeClass('settings');
			document.body.removeEvent('swipe', this._do_close);
			document.body.removeEvent('click:relay(#app)', this._do_close);
		}
		else
		{
			document.body.addClass('settings');
			document.body.addEvent('swipe', this._do_close);
			document.body.addEvent('click:relay(#app)', this._do_close);
		}
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
