var TurtlModal = Composer.Event.extend({
	options: {
		inject: 'body'
	},

	elements: {
		container: null,
		gutter: null
	},

	is_open: false,

	initialize: function(options)
	{
		options || (options = {});
		Object.keys(options).forEach(function(k) {
			this.options[k] = options[k];
		}.bind(this));

		this.elements.container = new Element('div');
		this.elements.container.addClass('turtl-modal');
		this.elements.gutter = new Element('div')
			.addClass('modal-gutter')
			.inject(this.elements.container);
		document.getElement(this.options.inject).appendChild(this.elements.container);

		this.bind('open', function() { this.is_open = true; }.bind(this));
		this.bind('close', function() { this.is_open = false; }.bind(this));
	},

	open: function(element)
	{
		this.elements.gutter.set('html', '');
		this.elements.gutter.appendChild(element);

		this.elements.container.addClass('active');
		this.trigger('open');
	},

	close: function()
	{
		if(!this.is_open) return;
		// slide out
		this.elements.container.removeClass('active');
		this.trigger('close');
		(function() {
			this.elements.gutter.set('html', '');
		}).delay(500, this);
	}
});

