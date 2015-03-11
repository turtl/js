/**
 * A plugin to grow textareas automatically
 */
var Autogrow = Composer.Base.extend({
	options: {
	},

	textarea: null,

	initialize: function(textarea, options)
	{
		this.set_options(options);
		this.textarea = textarea;

		this._resize = function() { this.keypress(); }.bind(this);
		this._resize_delay = function() { setTimeout(this.keypress.bind(this)); }.bind(this)
		this.attach();
	},

	attach: function()
	{
		this.textarea.addEvent('change',  this._resize_delay);
		this.textarea.addEvent('cut', this._resize_delay);
		this.textarea.addEvent('paste', this._resize_delay);
		this.textarea.addEvent('drop', this._resize_delay);
		this.textarea.addEvent('keydown', this._resize_delay);

		if(this.textarea.get('value').length > 0)
		{
			this.keypress();
		}
	},

	detach: function()
	{
		this.textarea.removeEvent('change',  this._resize_delay);
		this.textarea.removeEvent('cut', this._resize_delay);
		this.textarea.removeEvent('paste', this._resize_delay);
		this.textarea.removeEvent('drop', this._resize_delay);
		this.textarea.removeEvent('keydown', this._resize);
	},

	keypress: function()
	{
		var max_height = parseInt(this.textarea.getStyle('max-height')) || -1;
		var pad_top = parseInt(this.textarea.getStyle('padding-top')) || 0;
		var pad_bot = parseInt(this.textarea.getStyle('padding-bottom')) || 0;
		this.textarea.setStyles({height: 'auto'});
		var height = this.textarea.scrollHeight;
		if(max_height > 0 && height >= max_height)
		{
			height = max_height;
			this.textarea.setStyles({overflow: 'auto'});
		}
		else
		{
			this.textarea.setStyles({overflow: ''});
		}
		height -= (pad_top + pad_bot);
		this.textarea.setStyles({height: height});
	}
});

