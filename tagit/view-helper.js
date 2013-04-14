
// some generic functions
var image_url	=	function(url)
{
	return url;
};

// closely mimics PHP's empty function
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

