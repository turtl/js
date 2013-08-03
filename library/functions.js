function toJSON(object)
{
	window._toJSON_disable_protect = true;
	var ret	=	object.toJSON();
	window._toJSON_disable_protect = false;
	return ret;
}

/**
 * takes raw (non-mootools) object from whatever addon is running and ensures
 * that it is recursively turned into a mootools object
 */
function data_from_addon(data)
{
	return JSON.decode(JSON.encode(data));
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
function img(url)
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

function get_url()
{
	if(History.enabled)
		var url		=	new String(window.location.pathname).replace(/^\/?/, '');
	else
		var url		=	new String(window.location.hash).replace(/^#!\/?/, '');
	return url;
}

function get_data_from_querystring(url)
{
	url || (url = new String(window.location.hash).replace(/.*?&/, ''));
	var data = {};
	url.split('&').each(function(d) {
		var pieces	=	d.split('=');
		data[pieces[0]]	=	unescape(pieces[1]);
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
		var str	=	'';
		for(var i = 0; i < num - this.toString().length; i++)
		{
			str	+=	pad;
		}
		return str + this.toString();
	}
});

function clicked_outside(e, obj)
{
	if(!obj || !e || !obj.getCoordinates) return false;
	var c	=	obj.getCoordinates();
	if(e.page.x == 0 || e.page.y == 0 || c.bottom == 0) return false;
	var x	=	e.page.x;
	var y	=	e.page.y;
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

var empty	=	function(obj)
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
			var items	=	0;
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
		val = unescape(val);
		data[key] = val;
	});
	return data;
};

var view	=	{
	escape: function(str)
	{
		return str;
	},

	tagetize: function(tag_name)
	{
		return tag_name.toLowerCase().clean();
	},

	boardize: function(board_name)
	{
		return board_name;
	},

	// TODO: figure out why this sucks and breaks links.
	// TODO: figure out if actually needed anyway?
	make_links: function(text)
	{
		return text;
		text = text.replace(/"([\w]+):(\/\/([\.\-\w_\/:\?\+\&~#=%,\(\)]+))/gi, '"$1::$2"');
		text = text.replace(/([\w]+:\/\/)([\.\-\w_\/:\?\+\&~#=%,\(\)]+)/gi, '<a target="_blank" href="$1$2">$2</a>');
		text = text.replace(/"([\w]+)::(\/\/([\.\-\w_\/:\?\+\&~#=%,\(\)]+))/gi, '"$1:$2"');
		return text;
	},

	paginate: function(url, page_number, items_per_page, total_items, max_pages, prevnext, showjumps, no_page_1)
	{
		if(typeof(prevnext) == 'undefined') prevnext = true;
		if(typeof(showjumps) == 'undefined') showjumps = true;
		if(typeof(no_page_1) == 'undefined') no_page_1 = true;

		var pages, i, i_end, diff, n, first;
		page_number	=	parseInt(page_number);

		if(empty(url))
		{
			return;
		}
		
		pagestring	=	'';
		separator	=	'';
		if( page_number == '')
		{
			page_number	=	1;
		}
		pages	=	Math.ceil(total_items / items_per_page);
		
		if(total_items <= items_per_page)
		{
			return;
		}
		if( pages < 2 )
		{
			return;
		}
		
		if(prevnext)
		{
			if(page_number == 1)
			{
				pagestring	+=	'<span class="sel">prev</span>' + separator;
			}
			else
			{
				if((page_number - 1) == 1)
				{
					if(no_page_1)
					{
						pagestring	+=	'<span><a href="'+ url.replace(/(\/|\?|\&)?\[page\]/, '') +'">prev</a></span>' + separator;
					}
					else
					{
						pagestring	+=	'<span><a href="'+ url.replace(eval('/'+'[page]'.escapeRegExp()+'/g'), 1) +'">prev</a></span>' + separator;
					}
				}
				else
				{
					pagestring	+=	'<span><a href="'+ url.replace(eval('/'+'[page]'.escapeRegExp()+'/g'), (page_number - 1)) +'">prev</a></span>' + separator;
				}
			}
		}

		if( pages <= max_pages )
		{
			i	=	1;
			i_end	=	i + max_pages;
		}
		else
		{
			i	=	page_number - parseInt(max_pages / 2);
			if(i < 1)
			{
				diff	=	0 - i;
				i	=	1;
			}
			i_end	=	i + max_pages - 1;
			if(i_end > pages)
			{
				i	=	i - (i_end - pages);
				i_end	=	pages;
			}
			if(i > 1)
			{
				n	=	page_number - max_pages;
				if( n < 1 )
				{
					n	=	1;
				}
				if(showjumps)
				{
					if(no_page_1)
					{
						pagestring	+=	'<span><a href="'+ url.replace(/(\/|\?|\&)?\[page\]/, '') +'">1</a></span>'+separator;
					}
					else
					{
						pagestring	+=	'<span><a href="'+ url.replace(eval('/'+'[page]'.escapeRegExp()+'/g'), '1') +'">1</a></span>'+separator;
					}
					
					if(no_page_1 && n == 1)
					{
						pagestring	+=	'<span><a href="'+ url.replace(/(\/|\?|\&)?\[page\]/, '') +'">&lt;&lt;</a></span>'+ separator;
					}
					else
					{
						pagestring	+=	'<span><a href="'+ url.replace(eval('/'+'[page]'.escapeRegExp()+'/g'), n) +'">&lt;&lt;</a></span>'+ separator;
					}
				}
			}
		}
		first	=	true;	
		while( (i <= i_end) && (i <= pages) )
		{
			if(first)
			{
				first		=	false;
			}
			else
			{
				pagestring	+= separator;
			}
			
			if(i != page_number) 
			{
				if(i != 1)
				{
					pagestring	+=	'<span><a href="'+ url.replace(eval('/'+'[page]'.escapeRegExp()+'/g'), i) +'">'+i+'</a></span>';
				}
				else
				{
					if(no_page_1)
					{
						pagestring	+=	'<span><a href="'+ url.replace(/(\/|\?|\&)?\[page\]/, '') +'">'+i+'</a></span>';
					}
					else
					{
						pagestring	+=	'<span><a href="'+ url.replace(eval('/'+'[page]'.escapeRegExp()+'/g'), '1') +'">'+i+'</a></span>';
					}
				}
			}
			else
			{
				pagestring	+=	'<span class="sel">'+i+'</span>';
			}
			
			i++;
		}
		if((i - 1) < pages)
		{
			n	=	page_number + max_pages;
			if( n > pages )
			{
				n	=	pages;
			}

			if(showjumps)
			{
				pagestring	+=	separator + '<span><a href="'+ url.replace(eval('/'+'[page]'.escapeRegExp()+'/g'), n)+ '">&gt;&gt;</a></span>';
				pagestring	+=	separator + '<span><a href="'+ url.replace(eval('/'+'[page]'.escapeRegExp()+'/g'), pages)+ '">'+pages+'</a></span>';
			}
		}

		if(prevnext)
		{
			if(page_number == pages)
			{
				pagestring	+=	separator + '<span class="sel">next</span>';
			}
			else
			{
				pagestring	+=	separator + '<span><a href="'+ url.replace(eval('/'+'[page]'.escapeRegExp()+'/g'), (page_number + 1)) +'">next</a></span>';
			}
		}

		return pagestring;
	}
};
