var HeaderController = Composer.Controller.extend({
	inject: 'header',

	elements: {
		'h1': 'el_header',
		'.actions-container': 'el_actions'
	},

	events: {
		'click a.logo, space': 'toggle_sidebar',
		'click .actions li .item-actions li a': 'fire_menu_action',
		'click .actions li': 'fire_action',
	},

	actions: [],

	bind_to: null,
	notifications: {},
	title_updater: null,

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
	},

	render: function()
	{
		this.html(view.render('modules/header/index', {
			logged_in: turtl.user.logged_in,
			actions: this.actions
		}));
		this.render_actions();
	},

	update_title: function(newtitle) {
		if(this.title_updater) this.title_updater(newtitle);
	},

	render_title: function(title, backurl, options)
	{
		options || (options = {});

		var html = title || '&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;';
		if(backurl) {
			html = '<a href="'+ backurl +'" rel="back"><icon>'+icon('back')+'</icon>{{space}}'+html+'</a>';
			this.el.addClass('has-back');
		} else {
			html = '{{space}}<span>'+html+'</span>';
			this.el.removeClass('has-back');
		}
		if(options.prefix_space) {
			var space = turtl.profile.current_space();
			var color = space.get_color();
			html = html.replace(/{{\s*space\s*}}/g, '<space class="'+color.txt+'" style="background-color: '+color.bg+';">'+space.get('title')+'</space>');
		} else {
			html = html.replace(/{{\s*space\s*}}/g, '');
		}

		var update_title = function() {
			if(!options.prefix_space) return;
			this.render_title(title, backurl, options);
		}.bind(this);
		this.title_updater = function(newtitle) {
			this.render_title(newtitle, backurl, options);
		}.bind(this);
		if(turtl.profile) {
			this.with_bind(turtl.profile.get('spaces'), ['change:title', 'change:color'], update_title, 'header:bind-space-title:'+this.cid());
		}
		this.with_bind(turtl.events, 'profile:set-current-space', update_title, 'header:bind-space-title:'+this.cid());
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

	toggle_sidebar: function(e) {
		if(this.el.hasClass('has-back')) return;
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
			this.bind_to.trigger('header:menu:fire-action', rel, a);
		}.bind(this));
	},
});

