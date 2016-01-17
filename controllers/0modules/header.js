var HeaderController = Composer.Controller.extend({
	inject: 'header',

	elements: {
		'h1': 'el_header',
		'.actions-container': 'el_actions'
	},

	events: {
		'click a.logo': 'toggle_sidebar',
		'click .actions li .item-actions li a': 'fire_menu_action',
		'click .actions li': 'fire_action'
	},

	actions: [],

	bind_to: null,
	notifications: {},

	init: function()
	{
		if(!this.bind_to) this.bind_to = turtl.events;
		this.render();
		this.with_bind(turtl.user, ['login', 'logout'], this.render.bind(this));
		this.with_bind(this.bind_to, 'header:set-actions', this.set_actions.bind(this));
		this.with_bind(this.bind_to, 'header:push-actions', function(actions, binder) {
			var old_actions = this.actions;
			this.set_actions(actions);
			binder.bind('close', this.set_actions.bind(this, old_actions));
		}.bind(this));
		this.with_bind(turtl.events, 'notification:set', function(type) {
			this.notifications[type] = true;
			this.update_notification();
		}.bind(this));
		this.with_bind(turtl.events, 'notification:clear', function(type) {
			delete this.notifications[type];
			this.update_notification();
		}.bind(this));
	},

	render: function()
	{
		this.html(view.render('modules/header/index', {
			logged_in: turtl.user.logged_in,
			actions: this.actions
		}));
		this.render_actions();
		this.update_notification();
	},

	render_title: function(title, backurl, options)
	{
		options || (options = {});

		document.title = 'Turtl';
		var html = title || '&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;';
		if(backurl)
		{
			html = '<a href="'+ backurl +'" rel="back"><icon>'+icon('back')+'</icon><span>&nbsp;&nbsp;'+ html +'</span></a>';
			this.el.addClass('has-back');
		}
		else
		{
			html = '<span>'+html+'</span>';
			this.el.removeClass('has-back');
		}
		var html = '<em>'+html+'</em>';

		this.el_header.set('html', html);
	},

	render_actions: function()
	{
		var content = view.render('modules/header/actions', {
			actions: this.actions
		});
		this.el_actions.set('html', content);
	},

	set_actions: function(actions)
	{
		this.actions = actions;
		this.render_actions();

		var con = this.get_subcontroller('menu-actions');
		if(con) con.release();

		if(!actions) return;

		var menu = actions.filter(function(act) {
			return act.name == 'menu';
		})[0];
		if(menu)
		{
			var menu_el = this.el.getElement('.menu-actions');
			this.track_subcontroller('menu-actions', function() {
				return new ItemActionsController({
					inject: menu_el,
					actions: menu.actions,
					add_url: true
				});
			}.bind(this));
		}
	},

	toggle_sidebar: function(e)
	{
		if(e) e.stop();
		this.bind_to.trigger('sidebar:toggle');
	},

	fire_action: function(e)
	{
		if(!e) return;
		var li = Composer.find_parent('li', e.target);
		var rel = li && li.get('rel');
		if(rel == 'menu') return;
		e.stop();
		if(!rel) return;
		setTimeout(function() {
			this.bind_to.trigger('header:fire-action', rel);
		}.bind(this));
	},

	fire_menu_action: function(e)
	{
		if(e) e.stop();
		var a = Composer.find_parent('a', e.target);
		var rel = a && a.get('rel');
		if(!rel) return;
		setTimeout(function() {
			this.bind_to.trigger('header:menu:fire-action', rel);
		}.bind(this));
	},

	update_notification: function()
	{
		// NOTE: disable header notifications until we need them (for app updates
		// for instance)
		return;
		if(turtl.user.logged_in && Object.keys(this.notifications).length > 0)
		{
			this.el.addClass('notify');
		}
		else
		{
			this.el.removeClass('notify');
		}
	}
});

