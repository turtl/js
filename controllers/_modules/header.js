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

	init: function()
	{
		this.render();
		this.with_bind(turtl.user, ['login', 'logout'], this.render.bind(this));
		this.with_bind(turtl.events, 'header:set-actions', this.set_actions.bind(this));
		this.with_bind(turtl.events, 'header:push-actions', function(actions, binder) {
			var old_actions = this.actions;
			this.set_actions(actions);
			binder.bind('close', this.set_actions.bind(this, old_actions));
		}.bind(this));
	},

	render: function()
	{
		this.html(view.render('modules/header/index', {
			logged_in: turtl.user.logged_in,
			actions: this.actions
		}));
		this.render_actions();
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
		turtl.events.trigger('sidebar:toggle');
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
			turtl.events.trigger('header:fire-action', rel);
		});
	},

	fire_menu_action: function(e)
	{
		if(e) e.stop();
		var a = Composer.find_parent('a', e.target);
		var rel = a && a.get('rel');
		if(!rel) return;
		setTimeout(function() {
			turtl.events.trigger('header:menu:fire-action', rel);
		});
	}
});

