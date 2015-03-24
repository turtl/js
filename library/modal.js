var TurtlModal = Composer.Controller.extend({
	inject: 'body',

	elements: {
		'.turtl-modal': 'container',
		'.modal-gutter': 'gutter'
	},

	is_open: false,

	init: function()
	{
		this.render();

		this.bind('open', function() { this.is_open = true; }.bind(this));
		this.bind('close', function() { this.is_open = false; }.bind(this));
	},

	render: function()
	{
		this.html('<div class="turtl-modal"><div class="modal-gutter"></div></div>');
	},

	open: function(element)
	{
		this.gutter.set('html', '');
		this.gutter.appendChild(element);

		this.container.addClass('active');
		this.trigger('open');
	},

	close: function()
	{
		if(!this.is_open) return;
		// slide out
		var html_copy = this.gutter.get('html');
		this.container.removeClass('active');
		this.trigger('close');
		this.gutter.set('html', html_copy).addClass('closing');
		(function() {
			this.gutter.set('html', '').removeClass('closing');
		}).delay(500, this);
	}
});

