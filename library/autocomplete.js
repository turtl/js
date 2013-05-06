var Autocomplete = new Class({
	Implements: [Options],

	options: {
		onFocus: null,
		onBlur: null,
		sort: function(a, b) { return a.localeCompare(b); }
	},

	el: null,
	data: [],
	fn_bound: null,

	initialize: function(element, autocomplete_data, options)
	{
		this.setOptions(options);
		this.el = element;
		this.update_data(autocomplete_data);
		this.fn_bound = this.autocomplete.bind(this);
		this.attach();

	},

	update_data: function(data)
	{
		data = Array.clone(data);
		this.data = data.sort(this.options.sort);
	},

	attach: function()
	{
		this.el.addEvent('keyup', this.fn_bound);
		if(this.options.onFocus) this.el.addEvent('focus', this.options.onFocus);
		if(this.options.onBlur) this.el.addEvent('blur', this.options.onBlur);
	},

	detach: function()
	{
		this.el.removeEvent('keyup', this.fn_bound);
		if(this.options.onFocus) this.el.removeEvent('focus', this.options.onFocus);
		if(this.options.onBlur) this.el.removeEvent('blur', this.options.onBlur);
	},

	autocomplete: function(e)
	{
		if(!e) return true;

		var ignore = [
			'enter',
			'backspace',
			'delete',
			'control',
			'alt',
			'shift',
			'meta',
			'tab',
			'home',
			'end',
			'pagedown',
			'pageup',
			'capslock',
			'up',
			'down',
			'left',
			'right'
		];
		if(ignore.contains(e.key) || e.control || e.alt || e.meta) return true;

		var val = this.el.get('value');
		if(val == '') return true;
		var data = this.data.filter(function(item) {
			return item.slice(0, val.length) == val;
		});
		var entry = data[0] ? data[0] : null;
		if(!entry) return true;

		if(val.length == entry.length) return true;

		this.el.set('value', entry);
		this.createSelection(this.el, val.length, entry.length);
	},

	/**
	 * Taken from http://stackoverflow.com/a/646662/236331
	 * Thanks, Darin Dimitrov!
	 */
	createSelection: function(field, start, end)
	{
		if(field.createTextRange)
		{
			var selRange = field.createTextRange();
			selRange.collapse(true);
			selRange.moveStart('character', start);
			selRange.moveEnd('character', end);
			selRange.select();
			field.focus();
		}
		else if(field.setSelectionRange)
		{
			field.focus();
			field.setSelectionRange(start, end);
		}
		else if(typeof field.selectionStart != 'undefined')
		{
			field.selectionStart = start;
			field.selectionEnd = end;
			field.focus();
		}
	}
});

