var TurtlModal = Composer.Event.extend({
	options: {
	},

	elements: {
		inject: 'body',
		container: null
	},

	initialize: function(options)
	{
		options || (options = {});
		Object.keys(options).forEach(function(k) {
			this.options[k] = options[k];
		}.bind(this));

		this.elements.container = new Element('div');
		this.elements.container.id = 'turtl-modal';
		document.getElement(this.options.inject).appendChild(this.elements.container);
	},

	open: function(element)
	{
		this.elements.container.set('html', '');
		this.elements.container.appendChild(element);

		document.body.addClass('modal');
		this.trigger('open');
	},

	close: function()
	{
		document.body.removeClass('modal');
		this.trigger('close');
	}
});

