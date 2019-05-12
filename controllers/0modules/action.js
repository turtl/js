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
	shortcut_idx: {},
	context: null,

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
		this.with_bind(this.context || turtl.keyboard, 'esc', this.close.bind(this));
		this.with_bind(this.context || turtl.keyboard, 'raw', function(obj) {
			if(obj.is_input) return;
			var key = !obj.shift && !obj.alt && !obj.meta && !obj.control && obj.key;
			var action = this.shortcut_idx[key];
			if(!action || !this.is_open) return;
			obj.stop();
			this.trigger('actions:fire', action.name);
			this.close();
		}.bind(this));
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
		var key_idx = {};
		actions.forEach(function(action) {
			if(!action.shortcut) return;
			key_idx[action.shortcut] = action;
		});
		this.shortcut_idx = key_idx;
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

		var offset = 6;
		var bottom_pos = function(i)
		{
			return method == 'open' ? offset + ((i + 1) * 54) : 0;
		};
		var rotate = method == 'open' ? '135deg' : '';

		var rad = 3.141592654 / 180;
		var start = 270;
		var end = 360;
		var total = this.el.getElements('ul li').length;

		this.el.getElements('ul li').each(function(el, i) {
			if(method == 'close')
			{
				el.setStyles({opacity: 0});
				return;
			}
			Velocity(el, {bottom: bottom_pos(i)+'px'}, {
				duration: duration,
				easing: ease
			});
			if(method == 'open')
			{
				el.setStyles({ opacity: 1 });
			}
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
		turtl.back.push(this.close.bind(this), this.cid());
	},

	close: function()
	{
		this.animate('close');
		this.el.removeClass('open');
		this.is_open = false;
		turtl.back.pop(this.cid());
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

