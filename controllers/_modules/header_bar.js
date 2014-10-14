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
	swipe: null,

	init: function()
	{
		this._do_close = function(e)
		{
			if(e.direction && e.direction != 'left') return;
			if(e.type == 'click' && Composer.find_parent('div.menu', e.target)) return;
			this.toggle_menu();
		}.bind(this);

		this.with_bind(turtl.user, ['login', 'logout'], this.render.bind(this));
		document.body.getElement('header').addEvent('click:relay(h1 a[rel=back])', this.go_back);
		this.render();

		this.bind_once('release', this.close_menu.bind(this));
	},

	release: function()
	{
		document.body.getElement('header').removeEvent('click:relay(h1 a[rel=back])', this.go_back);
		return this.parent.apply(this, arguments);
	},

	render: function()
	{
		var content = view.render('modules/header_bar', {
			user: toJSON(turtl.user)
		});
		this.html(content);

		this.track_subcontroller('size', function() {
			return new AccountProfileSizeController({
				inject: this.size_container
			});
		}.bind(this));

		this.track_subcontroller('notifications', function() {
			return new NotificationsController({
				button: document.getElement('header h1'),
				inject: document.getElement('header')
			})
		}.bind(this));
	},

	toggle_menu: function(e)
	{
		if(e) e.stop();
		if(!turtl.user.logged_in) return;

		if(document.body.hasClass('settings'))
		{
			this.close_menu();
		}
		else
		{
			document.body.addClass('settings');
			this.menu.addEvent('swipe', this._do_close);
			this.menu.addEvent('touchmove', this.cancel);
			document.body.addEvent('click:relay(#app)', this._do_close);
			modal.bind('open', this.close_menu.bind(this), 'header-bar:modal:close-menu');
		}
	},

	close_menu: function()
	{
		document.body.removeClass('settings');
		this.menu.removeEvent('swipe', this._do_close);
		this.menu.removeEvent('touchmove', this.cancel);
		document.body.removeEvent('click:relay(#app)', this._do_close);
		modal.unbind('open', 'header-bar:modal:close-menu');
	},

	cancel: function(e)
	{
		e.preventDefault();
		e.stopPropagation();
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
	},

	go_back: function(e)
	{
		if(e) e.stop();
		turtl.pop_title(true);
	}
});
