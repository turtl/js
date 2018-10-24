function clone(obj)
{
	return JSON.parse(JSON.stringify(obj));
}

/**
 * Allow javascript's Error class to be extended
 */
var extend_error = function(extend, errname)
{
	var err = function() {
		var tmp = extend.apply(this, arguments);
		tmp.name = this.name = errname;

		this.stack = tmp.stack
		this.message = tmp.message

		return this;
	};
	err.prototype = Object.create(extend.prototype, { constructor: { value: err } });
	return err;
};

/**
 * a promisified delay function.
 */
var delay = function(ms)
{
	return new Promise(function(resolve) {
		setTimeout(resolve.bind(this, 'Thanks for waiting =]'), ms);
	});
};

var string_repeat = function(string, num)
{
	return new Array(parseInt(num) + 1).join(string);
};

var make_index = function(collection, idx_field)
{
	var idx = {};
	collection.forEach(function(item) {
		if(idx_field)
		{
			idx[item[idx_field]] = item;
		}
		else
		{
			idx[item] = true;
		}
	});
	return idx;
};

var to_arr = function(array_or_args) {
	return Array.prototype.slice.call(array_or_args, 0);
};

var get_platform = function()
{
	if(config.client == 'desktop') {
		return 'desktop';
	}
	if(config.client.match(/mobile/) || config.client.match(/android/) || config.client.match(/ios/)) {
		return 'mobile';
	}
	return 'core';
};

var escape_regex = function(s)
{
	return s.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
};

var select_text = function(inp, from, to)
{
	var s = window.getSelection();
	var r = document.createRange();
	r.setStart(inp, from);
	r.setEnd(inp, to);
	s.removeAllRanges();
	s.addRange(r);
	return s;
};

var create_and_click = function(url, name)
{
	var download = new Element('a')
		.setStyles({visibility: 'hidden'})
		.set('html', 'Download '+ name.safe())
		.addClass('attachment')
		.setProperties({
			href: url,
			download: name,
			target: '_blank'
		});
	download.inject(document.body);
	fire_click(download);
	(function() { download.destroy(); }).delay(5000, this);
};

var download_blob = function(blob, options)
{
	options || (options = {});

	var url;
	return new Promise(function(resolve, reject) {
		url = URL.createObjectURL(blob);
		var name = options.name || 'download';
		create_and_click(url, name);
		resolve();
	}).finally(function() {
		if(url) URL.revokeObjectURL(url);
	});
};

/**
 * given a turtl front-end generated ID, return the timestamp it encapsulates
 */
var id_timestamp = function(id, options)
{
	options || (options = {});
	if(id.length == 24)
	{
		var timestamp = parseInt(id.substr(0, 8), 16) * 1000;
	}
	else
	{
		var timestamp = parseInt(id.substr(0, 12), 16);
	}
	if(options.unix)
	{
		timestamp = Math.round(timestamp / 1000);
	}
	return timestamp;
};

/**
 * Given an error object, return the best piece of it for rendering to console
 * (usually this is error_object.stack).
 */
function derr(error_object)
{
	if(error_object.stack) {
		return error_object.stack;
	}
	if(error_object instanceof Error) {
		return error_object;
	}
	if(error_object.type) {
		switch(error_object.type.toLowerCase()) {
			case 'api':
			case 'http':
				try {
					var msg = error_object.message.error.message;
				} catch(e) {
					var msg = error_object.message;
				}
				break;
			case 'validation':
				var msg = error_object.errors[0][1];
				break;
			default:
				var msg = error_object.message;
				break;
		}
		var err = new Error(msg.replace(/<.*?>/g, ''));
		err.core = true;
		err.error_data = error_object.message;
		return err;
	}
	return error_object;
}

function get_parent(obj)
{
	return obj.$get_parent();
}

function get_lang() {
	return (navigator.language || navigator.languages[0]);
}

function init_localization()
{
	var resources = {};
	Object.keys(locales).forEach(function(k) {
		resources[k] = {translation: locales[k]};
	});
	Object.keys(locales).forEach(function(k) {
		var split = k.split('-');
		var language = split[0];
		var locale = split[1];
		if(!locale) return;
		if(!resources[language]) resources[language] = resources[k];
	});
	i18next.init({
		debug: false,
		lng: get_lang(),
		fallbackLng: 'en',
		resources: resources,
		nsSeparator: false,
		keySeparator: false,
		// these two make it so returning "" or null as a translation loads the
		// fallback, which is what we want.
		returnEmptyString: false,
		returnNull: false,
	});

	i18next.on("initialized", function(options) {
		turtl.events.trigger('app:localized');
	});
}

/**
 * convert a Uint8Array to a binary string
 */
function uint8array_to_string(array)
{
	// be smart about converting array buffers to arrays
	if(typeof ArrayBuffer != 'undefined' && array instanceof ArrayBuffer)
	{
		array = new Uint8Array(array);
	}
	var CHUNK_SZ = 0x8000;
	var c = [];
	for(var i = 0; i < array.length; i+=CHUNK_SZ)
	{
		c.push(String.fromCharCode.apply(null, array.subarray(i, i+CHUNK_SZ)));
	}
	return c.join("");
}

/**
 * takes raw (non-mootools) object from whatever addon is running and ensures
 * that it is recursively turned into a mootools object
 */
function data_from_addon(data)
{
	return JSON.parse(JSON.stringify(data));
}

// get the next tag of type "type" in the chain up the dom
function next_tag_up(tag, element)
{
	return element.get('tag') == tag ? element : next_tag_up(tag, element.getParent());
}

// for diffing two arrays against each other
function arrdiff(arr1, arr2) { return arr1.filter(function(el) { return !arr2.contains(el); }); }

// used in templating. wraps around EVERY image url, and rewrites it to use whatever
// storage facility we require (probably S3/cloudfront)
function asset(url)
{
	if(window._base_url)
	{
		return window._base_url.replace(/\/$/, '') + url;
	}
	else
	{
		return url;
	}
}

function fire_click(node)
{
	if(document.createEvent)
	{
		var evt = document.createEvent('MouseEvents');
		evt.initEvent('click', true, false);
		node.dispatchEvent(evt);	
	}
	else if(document.createEventObject)
	{
		node.fireEvent('onclick');	
	}
	else if(typeof node.onclick == 'function')
	{
		node.onclick();	
	}
}

function get_url()
{
	if(History.enabled)
		var url = new String(window.location.pathname).replace(/^\/?/, '');
	else
		var url = new String(window.location.hash).replace(/^#!\/?/, '');
	return url;
}

function icon(name)
{
	// it's *absolutely* ok to have different names point to the same icons.
	// icons should be named by their context, not by the actual icon that
	// represents them. then later on if we want to split icons out, we can do
	// so using their *meaning* instead of the representation of their meaning
	var icons = {
		account: 'e80a',
		add: 'e82e',
		add_user: 'e829',
		arrow: 'e80b',
		attach: 'e837',
		attachment: 'e837',
		back: 'e835',
		board: 'e803',
		boards: 'e803',
		bookmark: 'e814',
		close: 'e819',
		connection: 'e839',
		edit: 'e815',
		everything: 'e81a',
		feedback: 'e83e',
		file: 'e837',
		image: 'e80e',
		invite: 'e810',
		lock: 'e821',
		logout: 'e838',
		menu: 'e808',
		more: 'e80b',
		next: 'e80b',
		note: 'e804',
		notes: 'e809',
		notification: 'e810',
		password: 'e808',
		preview: 'e83f',
		protected: 'e821',
		remove: 'e81d',
		search: 'e83a',
		selected: 'e81e',
		settings: 'e807',
		share: 'e83d',
		sort: 'e80b',
		sync: 'e82d',
		tag: 'e80f',
		write: 'e804'
	};
	var hex = icons[name];
	if(!hex) return false;
	return '&#x'+hex+';';
}

function svg(name)
{
	var map = {
		loading: 'load'
	};
	if(map[name]) name = map[name];
	return svg_icons[name];
}

function get_data_from_querystring(url)
{
	url || (url = new String(window.location.hash).replace(/.*?&/, ''));
	var data = {};
	url.split('&').each(function(d) {
		var pieces = d.split('=');
		data[pieces[0]] = decodeURIComponent(pieces[1]);
	});
	return data;
}

function decode_entities(str) {
	var e = document.createElement('div');
	e.innerHTML = str;
	// handle case of empty input
	return e.childNodes.length === 0 ? "" : e.childNodes[0].nodeValue;
}

Array.prototype.unique = function() {
	var a = this.concat();
	for(var i=0; i<a.length; ++i) {
		for(var j=i+1; j<a.length; ++j) {
			if(a[i] === a[j])
				a.splice(j, 1);
		}
	}

	return a;
};

String.implement({
	capitalize: function()
	{
		return (this.charAt(0).toUpperCase() + this.slice(1));
	},

	pad: function(num, pad)
	{
		var str = '';
		for(var i = 0; i < num - this.toString().length; i++)
		{
			str	+=	pad;
		}
		return str + this.toString();
	},

	safe: function()
	{
		return this.replace(/<\/?script(.*?)>/ig, '');
	}
});

function sluggify(string)
{
	return string.trim()
		.toLowerCase()
		.replace(/[^a-z0-9\-\_]/g, '-')
		.replace(/-+/g, '-')
		.replace(/(^-|-$)/, '');
}

function clicked_outside(e, obj)
{
	if(!obj || !e || !obj.getCoordinates) return false;
	var c = obj.getCoordinates();
	if(e.page.x == 0 || e.page.y == 0 || c.bottom == 0) return false;
	var x = e.page.x;
	var y = e.page.y;
	if(x < c.left || x > c.right || y < c.top || y > c.bottom)
	{
		// click was outside given object
		return true;
	}
	return false;
}

Element.implement({ 
	monitorOutsideClick: function(fn) {
		document.addEvent('click', function(e) {
			if(clicked_outside(e, this))
			{
				fn();
			}
		}.bind(this));
	}
});

var empty = function(obj)
{
	if(obj == null)
	{
		return true;
	}

	switch(typeof(obj))
	{
	case 'undefined':
		return true;
	case 'number':
		return obj == 0;
	case 'string':
		return obj == '';
	case 'object':
		if(typeof(obj.length) == 'function')
		{
			return obj.length() == 0;
		}
		else
		{
			var items = 0;
			Object.each(obj, function(val, key) {
				items++;
			});
			return items == 0;
		}
	}
};

var parse_querystring = function(qs)
{
	if(!qs) qs = window.location.search.replace(/^\?/, '');
	qs = qs.split('&');
	var data = {};
	qs.each(function(kv) {
		kv = kv.split('=');
		var key = kv[0];
		var val = kv[1];
		val = decodeURIComponent(val);
		data[key] = val;
	});
	return data;
};

var view = {
	render: function(tpl, data, options)
	{
		data || (data = {});
		options || (options = {});

		if(!TurtlTemplates[tpl]) throw new Error('missing template: '+ tpl);
		return TurtlTemplates[tpl](data);
	},

	fix_template_paths: function()
	{
		// handlebars CLI is different on linux vs mac wrt how it treats slashes
		// in the recursive view directory soo we have to run a fix here
		Object.keys(TurtlTemplates).forEach(function(key) {
			var path = key.replace(/^\//, '');
			TurtlTemplates[path] = TurtlTemplates[key];
		});
	},

	escape: function(str)
	{
		return str;
	},

	tagetize: function(tag_name, options)
	{
		options || (options = {});

		tag_name = tag_name.toLowerCase();
		if(options.escape)
		{
			tag_name = tag_name
				.replace(/&(?!amp;)/g, '&amp;')
				.replace(/"/g, '&quot;');
		}
		else
		{
			tag_name = tag_name
				.replace(/&amp;/g, '&')
				.replace(/&quot;/g, '"')
		}
		tag_name = tag_name.clean();
		return tag_name;
	},

	boardize: function(board_name)
	{
		return board_name;
	},

	markdown: function(body)
	{
		return md.render(body);
	}
};

var test_click = function()
{
	var blob = new Blob(['get a job'], {type: 'text/plain'});
	var url = URL.createObjectURL(blob);
	var name = 'test-download.txt';
	var atag = new Element('a')
		.set('html', 'Download '+ name.safe())
		.addClass('attachment')
		.setProperties({
			href: url,
			download: name,
			target: '_blank'
		})
		.setStyles({
			'font-size': '40px',
			'color': 'blue'
		});
	atag.inject($E('#main'), 'top');
};

var permcheck = function(space, permission) {
	var can = space.can_i(permission);
	if(!can) barfr.barf(i18next.t('You do not have the needed permission to do that on this space: {{perm}}', {perm: permission}));
	return can;
};

/**
 * Source: https://github.com/niklasvh/base64-arraybuffer
 * Copyright (c) 2012 Niklas von Hertzen Licensed under the MIT license.
 *
 * (thank you from the Turtl team)
 */
var base64_to_buffer = (function() {
	// Use a lookup table to find the index.
	var chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
	var lookup = new Uint8Array(256);
	for (var i = 0; i < chars.length; i++) {
		lookup[chars.charCodeAt(i)] = i;
	}
	return function(base64) {
		var bufferLength = base64.length * 0.75,
		len = base64.length, i, p = 0,
		encoded1, encoded2, encoded3, encoded4;

		if (base64[base64.length - 1] === "=") {
			bufferLength--;
			if (base64[base64.length - 2] === "=") {
				bufferLength--;
			}
		}

		var arraybuffer = new ArrayBuffer(bufferLength),
		bytes = new Uint8Array(arraybuffer);

		for (i = 0; i < len; i+=4) {
			encoded1 = lookup[base64.charCodeAt(i)];
			encoded2 = lookup[base64.charCodeAt(i+1)];
			encoded3 = lookup[base64.charCodeAt(i+2)];
			encoded4 = lookup[base64.charCodeAt(i+3)];

			bytes[p++] = (encoded1 << 2) | (encoded2 >> 4);
			bytes[p++] = ((encoded2 & 15) << 4) | (encoded3 >> 2);
			bytes[p++] = ((encoded3 & 3) << 6) | (encoded4 & 63);
		}

		return arraybuffer;
	};
})();

