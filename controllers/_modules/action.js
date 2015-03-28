var ActionController = Composer.Controller.extend({
	inject: '#main',
	class_name: 'action',

	elements: {
		'> ul': 'el_actions'
	},

	events: {
		'click a[rel=main]': 'fire_main',
		'click a[rel=open]': 'toggle_open',
		'click ul > li': 'fire_action'
	},

	actions: [],

	init: function()
	{
		this.with_bind(turtl.events, 'actions:update', function(actions) {
			this.actions = actions;
			this.render();
		}.bind(this));

		var click_outside = function(e)
		{
			var inside = Composer.find_parent('#main > .action', e.target);
			if(inside) return;
			this.close();
		}.bind(this);
		document.body.addEvent('click', click_outside);
		this.bind('release', function() { document.body.removeEvent('click', click_outside); });
	},

	render: function()
	{
		if(this.actions)
		{
			this.html(view.render('modules/actions', {
				actions: this.actions
			}));
			this.el.removeClass('hide');
		}
		else
		{
			this.html('');
			this.el.addClass('hide');
		}
	},

	fire_main: function(e)
	{
		if(e) e.stop();
		turtl.events.trigger('actions:fire', this.actions[0].name);
	},

	fire_action: function(e)
	{
		if(e) e.stop();
		var li = Composer.find_parent('.action > ul > li', e.target);
		if(!li) return false;
		turtl.events.trigger('actions:fire', li.get('rel'));
		this.el.removeClass('open');
	},

	animate: function(method)
	{
		var duration = method == 'open' ? 350 : 50;
		var ease = method == 'open' ? [10, 3] : null;
		var bottom = parseInt(this.el.getElement('a.abutton').getParent().getStyle('bottom'));
		var botfn = function(i)
		{
			return method == 'open' ? ((i + 1) * 56) : 0;
		};
		var rotate = method == 'open' ? '135deg' : '';

		this.el.getElements('ul li').each(function(el, i) {
			Velocity(el, {
				bottom: (bottom + botfn(i)) + 'rem'
			}, {
				duration: duration,
				easing: ease
			});
			if(method == 'open')
			{
				el.setStyles({opacity: 1});
			}
			if(method == 'close')
			{
				Velocity(el, {opacity: [0, 1]}, {
					duration: duration
				});
			}
		});
		return Velocity(this.el.getElement('.abutton icon'), {rotateZ: rotate}, {
			duration: duration,
			easing: [1, 1]
		});
	},

	open: function()
	{
		this.animate('open')
			.then(function() {
			});
		setTimeout(function() { this.el.addClass('open'); }.bind(this));
	},

	close: function()
	{
		this.animate('close').bind(this);
		this.el.removeClass('open');
	},

	toggle_open: function(e)
	{
		if(e) e.stop();
		if(this.el.hasClass('open'))
		{
			this.close();
		}
		else
		{
			this.open();
		}
	}
});

