var TurtlOverlay = Composer.Controller.extend({
	inject: 'body',
	class_name: 'turtl-overlay',

	events: {
		'click': 'click'
	},

	actions: [],

	unclickable: false,

	init: function()
	{
		this.render();
		this.with_bind(turtl.events, 'overlay:open', this.open.bind(this));
		this.with_bind(turtl.events, 'overlay:close', this.close.bind(this));
		this.with_bind(turtl.events, 'overlay:nop', this.pop_nop.bind(this));
	},

	render: function()
	{
		this.html('');
		if(this.unclickable) this.el.addClass('unclickable');
	},

	open: function(action, options)
	{
		options || (options = {});
		this.actions.push(action);
		if(!this.el.hasClass('active'))
		{
			this.el.addClass('active');
			if(!this.unclickable)
			{
				this.el.set('title', 'Click to close');
			}
		}
	},

	close: function()
	{
		this.el.removeClass('active').addClass('closing');
		this.el.setStyle('z-index', '');
		setTimeout(function() {
			this.el.removeClass('closing');
		}.bind(this), 350);
		this.actions = [];
	},

	click: function(e)
	{
		if(this.unclickable) return;
		this.pop_action();
	},

	pop_action: function()
	{
		var action = this.actions.pop();
		var res = true;
		if(action) res = action({from_overlay: true});
		if(!res)
		{
			this.actions.push(action);
			return;
		}
		if(this.actions.length == 0) this.close();
	},

	pop_nop: function()
	{
		this.actions.pop();
		if(this.actions.length == 0) this.close();
	}
});
