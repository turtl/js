var ItemActionsController = Composer.Controller.extend({
	elements: {
		'.item-actions': 'container',
		'.menu': 'menu',
		'.overlay': 'overlay'
	},

	events: {
		'click .item-actions > a': 'open',
		'click .overlay': 'close_click',
		'click .menu a[rel=close]': 'close_click',
		'click .menu a': 'close',
	},

	actions: [],
	close_action: true,

	init: function()
	{
		this.render();

		var closebind = this.close.bind(this);
		turtl.keyboard.addEvent('esc', closebind);
		this.bind('release', function() { turtl.keyboard.removeEvent('esc', closebind); });
	},

	render: function()
	{
		var actions = this.actions.slice(0);
		if(!Array.isArray(actions[0])) actions = [actions];
		if(this.close_action) actions.push([{name: 'Close', class: 'close'}]);

		this.with_bind(turtl.controllers.pages, 'start', this.close_url.bind(this));
		this.html(view.render('modules/item-actions', {
			title: this.title,
			actions: actions
		}));
	},

	open: function(e)
	{
		if(e) e.stop();
		this.container.addClass('open');
		this.menu.setStyles({height: 'auto'});
		var height = this.menu.getCoordinates().height;
		this.menu.setStyles({height: ''});
		$E('header').addClass('under');
		setTimeout(this.menu.setStyles.bind(this.menu, {height: height}));
		var close = turtl.push_modal_url('/actions');
		this.bind_once('close', close);
	},

	close_click: function(e)
	{
		if(e) e.stop();
		this.close();
	},

	close_url: function()
	{
		if(turtl.router.cur_path().match(/\-\/actions/)) return;
		this.close();
	},

	close: function()
	{
		this.container.removeClass('open');
		this.menu.setStyles({height: ''});
		$E('header').removeClass('under');
		this.trigger('close');
	}
});

