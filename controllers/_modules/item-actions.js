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
		'click .menu a': 'close'
	},

	actions: [],
	close_action: false,
	add_url: false,

	init: function()
	{
		this.render();

		var closebind = this.close.bind(this);
		turtl.keyboard.addEvent('esc', closebind);
		this.bind('release', function() { turtl.keyboard.removeEvent('esc', closebind); });

		this.with_bind(turtl.events, 'menu:open', function(cid) {
			if(cid == this.cid()) return false;
			// close this menu without animating
			this.menu.setStyles({display: 'none'});
			this.close({noroute: true});
			setTimeout(function() {
				this.menu.setStyles({display: ''});
			}.bind(this), 300);
		}.bind(this));

		// close the menu when we click outside
		var inside = function(e)
		{
			var is_inside = Composer.find_parent('.item-actions[rel='+this.cid()+']', e.target);
			if(is_inside) return;
			this.close();
		}.bind(this);
		$(document.body).addEvent('click', inside);
		this.bind('release', function() {
			$(document.body).removeEvent('click', inside);
		});

		this.with_bind(turtl.controllers.pages, 'start', this.close_url.bind(this, {noroute: true}));
	},

	render: function()
	{
		var actions = this.actions.slice(0);
		if(!Array.isArray(actions[0])) actions = [actions];
		if(this.close_action) actions.push([{name: 'Close', class: 'close'}]);

		this.html(view.render('modules/item-actions', {
			cid: this.cid(),
			title: this.title,
			actions: actions
		}));
	},

	open: function(e)
	{
		if(e) e.stop();
		var came_from_actions = turtl.router.cur_path().match('-actions:/menu');
		turtl.events.trigger('menu:open', this.cid());
		console.log('open!');
		this.container.addClass('open');
		this.menu.setStyles({height: 'auto'});
		var height = this.menu.getCoordinates().height;
		this.menu.setStyles({height: ''});
		setTimeout(this.menu.setStyles.bind(this.menu, {height: height}));
		this.bind_once('close', function(options) {
			options || (options = {});
		});
	},

	close_click: function(e)
	{
		if(e) e.stop();
		this.close();
	},

	close_url: function()
	{
		if(turtl.router.cur_path().match('-actions:/menu')) return;
		this.close();
	},

	close: function(options)
	{
		this.container.removeClass('open');
		this.menu.setStyles({height: ''});
		$E('header').removeClass('under');
		setTimeout(function() {
			this.trigger('close', options);
		}.bind(this));
	}
});

