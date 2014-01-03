// extend_error is in functions.js
var SyncError	=	extend_error(Error, 'SyncError');

/**
 * Default sync function, persists items to the local DB
 */
Composer.sync	=	function(method, model, options)
{
	options || (options = {});
	if(options.skip_local_sync && method == 'delete')
	{
		if(options.success) options.success();
		return;
	}

	// derive the table name from the model's base_url field.
	var table	=	options.table || model.get_url().replace(/^\/(.*?)(\/|$).*/, '$1');
	if(table == 'users') table = 'user';	// kind of a hack. oh well.

	// some debugging, can make tracking down sync issues easier
	if(_sync_debug_list.contains(table))
	{
		var action = method == 'delete' ? 'delete' : (method == 'create' ? 'add' : 'edit');
		console.log('save: '+ table +': mem -> db ('+ action +')');
	}

	if(!turtl.db[table])
	{
		throw new SyncError('Bad db.js table: '+ table);
	}

	// define some callbacks for our indexeddb queries
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
		if(!options.skip_local_sync) modeldata.last_mod = new Date().getTime();
		if(!options.skip_remote_sync) modeldata.local_change = 1;
		if(options.args) modeldata.meta = options.args;
	}

	// any k/v data that doesn't go by the "id" field should have it's key field
	// filled in here.
	if(table == 'user')
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
		model._cid		=	model.cid() + '.' + (new Date().getTime());
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
		turtl.db[table].update(modeldata).then(success, error);
		break;
	default:
		throw new SyncError('Bad method passed to Composer.sync: '+ method);
		return false;
	}

	// try not to double-sync (mem -> db -> mem). by tracking this model, we can
	// avoid it being synced from DB on the next local sync
	turtl.sync.ignore_on_next_sync(model.id(), {type: 'local'});
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
	}

	console.log('API: '+ method.toUpperCase().replace(/_/g, '') +' '+ model.base_url);

	var headers	=	{};
	var args	=	options.args;
	var url		=	model.get_url();
	args || (args = {});
	if(options.rawUpload)
	{
		// we're sending raw/binary data.
		args.cid	=	model.cid();
		url			=	url + '?' + Object.toQueryString(args);
		args		=	options.data;
		headers['Content-Type']	=	'application/octet-stream';
	}
	else
	{
		// don't want to send all data over a GET or DELETE
		if(method != 'get' && method != '_delete')
		{
			var data	=	model.toJSON();
			data.cid	=	model.cid();
			if(data.keys && data.keys.length == 0)
			{
				// empty string gets converted to empty array by the API for the keys
				// type (this is the only way to serialize an empty array via 
				// mootools' Request AJAX class)
				data.keys	=	'';
			}
			/*
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
			*/
			args.data = data;
		}
	}

	// call the API!
	turtl.api[method](url, args, {
		rawUpload: options.rawUpload,
		responseType: options.responseType,
		headers: headers,
		success: function(res) {
			// if we got sync_ids back, set them into our remote sync's ignore.
			// this ensures that although we'll get back the sync record(s) for
			// the changes we just made, we can ignore them when they come in.
			if(res.sync_ids && res.sync_ids.length > 0)
			{
				res.sync_ids.each(function(sync_id) {
					turtl.sync.ignore_on_next_sync(sync_id, {type: 'remote'});
				});
			}
			// carry on
			if(options.success) options.success.apply(this, arguments);
		},
		progress: options.progress,
		uploadprogress: options.uploadprogress,
		error: function(err, xhr) {
			if(method == '_delete' && xhr.status == 404)
			{
				// ok, we tried to delete it and it's not there. success? yes,
				// great success.
				if(options.success) options.success.apply(this, arguments);
				return;
			}
			if(options.error) options.error.apply(this, arguments);
		}
	});
};

