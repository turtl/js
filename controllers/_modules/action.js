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

	open: function()
	{
		this.el.addClass('show-menu');
		setTimeout(function() { this.el.addClass('open'); }.bind(this));
	},

	close: function()
	{
		this.el.removeClass('open');
		setTimeout(function() { this.el.removeClass('show-menu'); }.bind(this), 300);
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

