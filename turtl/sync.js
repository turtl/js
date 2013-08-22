// couldn't be simpler
Composer.sync	=	function(method, model, options)
{
	options || (options = {});
	if(options.skip_sync && method == 'delete')
	{
		options.success();
		return;
	}
	else if(options.skip_sync) return;
	switch(method)
	{
	case 'create':
		var method	=	'post'; break;
	case 'read':
		var method	=	'get'; break;
	case 'update':
		var method	=	'put'; break;
	case 'delete':
		var method	=	'_delete'; break;
	default:
		console.log('Bad method passed to Composer.sync: '+ method);
		return false;
	}

	// don't want to send all data over a GET or DELETE
	var args	=	options.args;
	args || (args = {});
	if(method != 'get' && method != '_delete')
	{
		var data	=	model.toJSON();
		if(options.subset)
		{
			var newdata	=	{};
			for(x in data)
			{
				if(!options.subset.contains(x)) continue;
				newdata[x]	=	data[x];
			}
			data	=	newdata;
		}
		args.data = data;
	}
	turtl.api[method](model.get_url(), args, {
		success: options.success,
		error: options.error
	});
};

