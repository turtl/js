/**
 * This is an autocomplete class for Mootools. It is very simple in that it
 * doesn't present a dropdown or add any extra markup, but instead suggests the
 * closest alphabetical match to the text in an input field based on the given
 * data. Any text added to the input is selected so you can continue typing
 * without disruption, or hit [enter] (or [return] if you're using an inferior
 * machine) or [tab] to finish the edit in that text box.
 *
 * Data *must* be a flat array of text items. To do otherwise has undefined
 * behavior.
 *
 * Usage:
 *   new Autocomplete(dog_type_input_field, ['shiba', 'husky', 'malamute']);
 *
 * -----------------------------------------------------------------------------
 *
 * Copyright (c) 2013, Lyon Bros LLC. (http://www.lyonbros.com)
 *
 * Licensed under The MIT License.
 * Redistributions of files must retain the above copyright notice.
 */
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
		// sort our data alphabetically, but clone it first since we don't want
		// to destroy the original data array passed.
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

		// let's ignore specific keys
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

		// grab the text value, exit if empty
		var val = this.el.get('value');
		if(val == '') return true;

		// find all data that begins with what's in the text box
		var data = this.data.filter(function(item) {
			return item.slice(0, val.length) == val;
		});

		// grab the first entry in our data, return if no matches
		var entry = data[0] ? data[0] : null;
		if(!entry) return true;

		// the full entry is typed out already, no need to do anything
		if(val.length == entry.length) return true;

		// set the full data entry into the text box
		this.el.set('value', entry);

		// select the remainder of the entry so it can be typed over if needed
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

