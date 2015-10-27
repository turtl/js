var TurtlOverlay = Composer.Controller.extend({
	inject: 'body',
	class_name: 'turtl-overlay',

	events: {
		'click': 'pop_action'
	},

	actions: [],

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
	},

	open: function(action, zindex)
	{
		this.actions.push(action);
		if(!this.el.hasClass('active'))
		{
			this.el.addClass('active');
			this.el.set('title', 'Click to close');
			if(zindex !== undefined)
			{
				this.setStyle('z-index', parseInt(zindex));
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
