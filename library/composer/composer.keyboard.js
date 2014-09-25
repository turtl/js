/**
 * This is a simple global key handler for attaching keyboard events to your
 * application.
 * -----------------------------------------------------------------------------
 *
 * Composer.js is an MVC framework for creating and organizing javascript 
 * applications. For documentation, please visit:
 *
 *     http://lyonbros.github.com/composer.js/
 * 
 * -----------------------------------------------------------------------------
 *
 * Copyright (c) 2011, Lyon Bros Enterprises, LLC. (http://www.lyonbros.com)
 * 
 * Licensed under The MIT License. 
 * Redistributions of files must retain the above copyright notice.
 */
(function() {
	var Keyboard = new Class({
		Implements: [Composer.Events, Options],

		// set to true to allow bindings based on meta keys
		// (ie "?" would be 'S-/' (shift + /)
		options: {
			meta_bind: false
		},

		_dispatch: null,

		initialize: function(options)
		{
			this.setOptions(options);

			// create a function bound to "this" and store it later so we can
			// unbind it when we detach
			this._dispatch = this.dispatch.bind(this);

			// start listening for keyboard events
			return this.attach();
		},

		attach: function()
		{
			$(document.body).addEvent('keyup', this._dispatch);
			return this;
		},

		detach: function()
		{
			$(document.body).removeEvent('keyup', this._dispatch);
			return this;
		},

		destroy: function()
		{
			this.detach();	// stop listening to keyboard events
			this.unbind();	// remove all events
			return this;
		},

		dispatch: function(e)
		{
			if(!e.key) return false;
			var ev = '';
			if(this.options.meta_bind)
			{
				if(e.shift) ev += 'S-';
				if(e.control) ev += 'C-';
				if(e.alt) ev += 'A-';
				if(e.meta) ev += 'M-';
			}
			ev += e.key;
			this.trigger(ev, e);
		}
	});

	// direct export (no need to do Composer.Keyboard.extend(...))
	Composer.Keyboard = Keyboard;
})();
