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
}

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
	if(error_object.stack)
	{
		return error_object.stack;
	}
	else
	{
		return error_object;
	}
}

function get_parent(obj)
{
	return obj.$get_parent();
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
function arrdiff(arr1, arr2) { return arr1.filter(function(el) { return !arr2.contains(el); }); };

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
		clear: 'e81a',
		edit: 'e815',
		file: 'e837',
		image: 'e80e',
		lock: 'e821',
		logout: 'e838',
		menu: 'e808',
		more: 'e80b',
		next: 'e80b',
		note: 'e804',
		notes: 'e809',
		personas: 'e800',
		remove: 'e81d',
		search: 'e83a',
		selected: 'e81e',
		settings: 'e807',
		share: 'e81c',
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
};

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
		return marked(body);
	}
};

