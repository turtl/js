var ActionController = Composer.Controller.extend({
	inject: '#main',
	class_name: 'action',

	elements: {
		'> ul': 'el_actions'
	},

	events: {
		'click a[rel=main]': 'fire_main',
		'click a[rel=open]': 'toggle_open'
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

	toggle_open: function(e)
	{
		if(e) e.stop();
		if(this.el.hasClass('open'))
		{
			this.el.removeClass('open');
		}
		else
		{
			this.el.addClass('open');
		}
	}
});

