var SidebarController = Composer.Controller.extend({
	xdom: true,
	el: '#sidebar',

	elements: {
		'> .overlay': 'overlay',
		'li[rel=share]': 'el_share',
		'.inner .connection': 'el_connection'
	},

	events: {
		'click > .overlay': 'close',
		'click li.add a': 'add_space',
		'click a.edit': 'edit_space',
		// close when clicking one of the sidebar links
		'click ul a': 'close',
	},

	is_open: false,

	init: function()
	{
		this.render();
		this.with_bind(turtl.controllers.pages, 'prerelease', this.close.bind(this));
		this.with_bind(turtl.events, 'sidebar:toggle', this.toggle.bind(this));
		this.with_bind(turtl.events, 'api:connect', this.render.bind(this));
		this.with_bind(turtl.events, 'api:disconnect', this.render.bind(this));
		this.with_bind(turtl.events, 'app:load:profile-loaded', this.render.bind(this));

		this.with_bind(turtl.user, 'login', function() {
			this.with_bind(turtl.profile.get('spaces'), ['change', 'add', 'remove', 'reset'], this.render.bind(this), 'sidebar:spaces:render');
		}, 'sidebar:login:render');

		var mc = new Hammer.Manager(this.el);
		mc.add(new Hammer.Press({time: 750}));
		mc.on('press', function(e) {
			var li = Composer.find_parent('li.space', e.target);
			if(!li) return;
			var settings = li.getElement('a.edit');
			if(!settings) return;
			settings.click();
		}, {time: 5000});

		var refresh = setInterval(function() {
			if(this.is_open) this.render();
		}.bind(this), 1000);
		this.bind('release', clearInterval.bind(window, refresh));
	},

	render: function()
	{
		if(!turtl.profile) return;
		var current_space = turtl.profile.current_space();
		var spaces = turtl.profile.get('spaces');
		var space_data = spaces.toJSON()
			.map(function(space) { 
				if(space.id == current_space.id()) space.current = true;
				space.color = spaces.get(space.id).get_color();
				return space;
			});
		return this.html(view.render('modules/sidebar', {
			username: turtl.user.get('username'),
			spaces: space_data,
			connected: (turtl.sync || {}).connected,
			open: this.is_open,
			last_sync: (turtl.sync || {}).last_sync,
			polling: (turtl.sync || {})._polling
		}));
	},

	open: function()
	{
		this.is_open = true;
		document.body.addClass('settings');
		turtl.push_title(i18next.t('Your spaces'), false);
		setTimeout(this.render.bind(this), 10);
		turtl.events.trigger('sidebar:open');
	},

	close: function()
	{
		if(!this.overlay) return;
		this.is_open = false;
		this.overlay.setStyles({position: 'fixed'});
		this.overlay.removeClass('show');
		setTimeout(function() {
			this.overlay.setStyles({position: ''});
		}.bind(this), 300);
		document.body.removeClass('settings');
		turtl.pop_title('hubba hubba');
		turtl.events.trigger('sidebar:close');
	},

	toggle: function()
	{
		if(!turtl.user.logged_in) return;
		if(document.body.hasClass('settings'))
		{
			this.close();
		}
		else
		{
			this.open();
		}
	},

	add_space: function(e)
	{
		if(e) e.stop();
		return new SpacesEditController();
	},

	edit_space: function(e)
	{
		if(e) e.stop();
		var li = Composer.find_parent('li', e.target);
		if(!li) return;
		var space_id = li.get('rel');
		if(!space_id) return;
		var space = turtl.profile.get('spaces').get(space_id);
		return new SpacesEditController({
			model: space,
		});
	}
});

