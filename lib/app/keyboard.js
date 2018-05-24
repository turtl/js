/**
 * This is a composer/mootools library for to handle global keyboard bindings in
 * a sane way, using moo's event handling and composer's event binding and
 * triggering.
 */
var TurtlKeyboard = Composer.Event.extend({
	_key_listener: null,

	options: {
		ignore_input_elements: true
	},

	initialize: function(options)
	{
		options || (options = {});

		Object.keys(options).forEach(function(key) {
			this.options[key] = options[key];
		}.bind(this));

		if(!this._key_listener)
		{
			this._key_listener = this.keydown.bind(this);
		}
	},

	attach: function()
	{
		document.body.addEvent('keydown', this._key_listener);
		return this;
	},

	detach: function()
	{
		document.body.removeEvent('keydown', this._key_listener);
		return this;
	},

	keydown: function(e)
	{
		var do_stop = false;
		var stopfn = function() { do_stop = true; };

		var is_input = Composer.match(e.target, 'input,select,textarea');

		this.trigger('raw', {
			key: e.key,
			code: e.code,
			shift: e.shift,
			meta: e.meta,
			control: e.control,
			alt: e.alt,
			stop: stopfn,
			is_input: is_input
		});

		if(this.options.ignore_input_elements && is_input) return

		if(do_stop) return;

		var key = e.key;
		var mods = [
			e.shift && 'shift',
			e.meta && 'meta',
			e.control && 'control',
			e.alt && 'alt'
		].filter(function(mod) { return !!mod; })
			.sort(function(a, b) { return a.localeCompare(b); });

		if(mods.indexOf(key) < 0) mods.push(key);
		var ev = mods.join('+').toLowerCase();
		this.trigger(ev);
	}
});

