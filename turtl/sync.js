// extend_error is in functions.js
var SyncError	=	extend_error(Error, 'SyncError');

/**
 * Default sync function, persists items to the local DB
 */
Composer.sync	=	function(method, model, options)
{
	options || (options = {});
    /*
	if(options.skip_sync && method == 'delete')
	{
		options.success();
		return;
	}
	else if(options.skip_sync) return;
    */

	var table	=	options.table || model.get_url().replace(/^\/(.*?)(\/|$).*/, '$1');
	if(!turtl.db[table])
	{
		throw new SyncError('Bad db.js table: '+ table);
		return false;
	}

	var success	=	function(res)
	{
		if(res instanceof Array && res.length == 1)
		{
			res	=	res[0];
		}
		if(options.success) options.success(res);
	};
	var error	=	options.error || function() {};

    if(method != 'read')
    {
        // serialize our model, and add in any extra data needed
        var modeldata		=	model.toJSON();
        modeldata.last_mod	=	new Date().getTime();
        if(!options.skip_remote_sync) modeldata.local_change = 1;
        if(options.args) modeldata.meta = options.args;
    }

	// any k/v data that doesn't go by the "id" field should have it's key field
	// filled in here.
	if(table == 'users')
	{
		modeldata.key	=	'user';
	}

	switch(method)
	{
	case 'read':
		turtl.db[table].get(model.id()).then(success, error);
		break;
	case 'create':
		// set the CID into the ID field. the API will ignore this field, except
		// to add it to the "sync" table, which will allow us to match the local
		// record with the remote record in the rare case that the object is
		// added to the API but the response (with the ID) doesn't update in the
		// local db (becuase of the client being closed, for instance, or the
		// server handling the request crashing after the record is added)
		modeldata.id	=	model.cid();
		turtl.db[table].add(modeldata).then(success, error);
		break;
	case 'delete':
        // delete flows through to update (after marking the item deleted). we
        // don't actually delete the item here because then the sync processes
        // would never know it changed.
        //
        // the remote sync (bless its heart) will check for "deleted" records
        // and remove them accordingly, once they have had sufficient time to
        // propagate to all local threads and have successfully been synced to
        // the server
        modeldata.deleted   =   1;
	case 'update':
        console.log('update (from local): ', JSON.encode(modeldata));
		turtl.db[table].update(modeldata).then(success, error);
		break;
	default:
		throw new SyncError('Bad method passed to Composer.sync: '+ method);
		return false;
	}
};

/**
 * This is the sync function used by the sync process to save data to the API.
 */
var api_sync	=	function(method, model, options)
{
	options || (options = {});

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
		throw new SyncError('Bad method passed to Composer.sync: '+ method);
		return false;
	}

	// don't want to send all data over a GET or DELETE
	var args	=	options.args;
	args || (args = {});
	if(method != 'get' && method != '_delete')
	{
		var data	=	model.toJSON();
		if(data.keys && data.keys.length == 0)
		{
			// empty string gets converted to empty array by the API for the keys
			// type (this is the only way to serialize an empty array via 
			// mootools' Request AJAX class)
			data.keys	=	'';
		}
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

