var ActionController = Composer.Controller.extend({
	inject: '#main',
	class_name: 'action',

	events: {
		'click a[rel=main]': 'fire_main',
		'click a[rel=open]': 'open_actions'
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
		}
		else
		{
			this.html('');
		}
	},

	fire_main: function(e)
	{
		if(e) e.stop();
		turtl.events.trigger('actions:fire', this.actions[0].name);
	},

	open_actions: function(e)
	{
		if(e) e.stop();
	}
});

