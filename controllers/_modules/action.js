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

	is_open: false,

	init: function()
	{
		var click_outside = function(e)
		{
			// TODO: allow click_outside for non-#main actions!
			var inside = Composer.find_parent('#main > .action', e.target);
			if(!this.is_open || inside || this.actions.length == 0) return;
			this.close();
		}.bind(this);
		document.body.addEvent('click', click_outside);
		this.bind('release', function() { document.body.removeEvent('click', click_outside); });
	},

	render: function()
	{
		if(this.actions)
		{
			if(this.actions.length == 1 && !this.actions[0].icon)
			{
				this.actions[0].icon = 'add';
			}
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

	set_actions: function(actions)
	{
		this.actions = actions;
		this.render();
	},

	fire_main: function(e)
	{
		if(e) e.stop();
		this.trigger('actions:fire', this.actions[0].name);
	},

	fire_action: function(e)
	{
		if(e) e.stop();
		var li = Composer.find_parent('.action > ul > li', e.target);
		if(!li) return false;
		this.trigger('actions:fire', li.get('rel'));
		this.close();
	},

	animate: function(method)
	{
		var duration = 350;
		var ease = [10, 3];
		var bottom = parseInt(this.el.getElement('a.abutton').getParent().getStyle('bottom'));
		var botfn = function(i)
		{
			return method == 'open' ? ((i + 1) * 56) : 0;
		};
		var rotate = method == 'open' ? '135deg' : '';

		this.el.getElements('ul li').each(function(el, i) {
			if(method == 'close')
			{
				el.setStyles({opacity: 0});
				return;
			}
			Velocity(el, {bottom: (bottom + botfn(i)) + 'rem'}, {
				duration: duration,
				easing: ease
			});
			if(method == 'open') el.setStyles({opacity: 1});
		});
		return Velocity(this.el.getElement('.abutton icon'), {rotateZ: rotate}, {
			duration: duration,
			easing: [1, 1]
		});
	},

	open: function()
	{
		this.animate('open');
		this.el.addClass('open');
		this.is_open = true;
	},

	close: function()
	{
		this.animate('close');
		this.el.removeClass('open');
		this.is_open = false;
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

