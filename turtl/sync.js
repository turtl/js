// extend_error is in functions.js
var SyncError = extend_error(Error, 'SyncError');

Composer.sync = function(method, model, options)
{
	options || (options = {});
	if(options.skip_sync)
	{
		if(options.success) options.success();
		return;
	}

	// derive the table name from the model's base_url field.
	var table = options.table || model.get_url().replace(/^\/(.*?)(\/|$).*/, '$1');

	var modeldata = null;
	if(['create', 'update'].contains(method))
	{
		// serialize our model, and add in any extra data needed
		modeldata = model.toJSON({skip_relational: true});
		if(options.args) modeldata.meta = options.args;
	}

	log.debug('sync: '+ table +': '+ method, modeldata);
	var opts = {success: options.success, error: options.error};
	switch(method)
	{
	case 'read':
		turtl.remote.send('item:'+method, {table: table, id: model.id()}, opts);
		break;
	case 'create':
		// set the CID into the ID field. the API will ignore this field, except
		// to add it to the "sync" table, which will allow us to match the local
		// record with the remote record in the rare case that the object is
		// added to the API but the response (with the ID) doesn't update in the
		// local db (becuase of the client being closed, for instance, or the
		// server handling the request crashing after the record is added)
		model._cid = model.cid();
		modeldata.id = model.cid();

		turtl.remote.send('item:'+method, {table: table, data: modeldata}, opts);
		break;
	case 'update':
		turtl.remote.send('item:'+method, {table: table, data: modeldata}, opts)
		break;
	case 'delete':
		turtl.remote.send('item:'+method, {table: table, id: model.id()}, opts);
		break;
	default:
		throw new SyncError('Bad method passed to Composer.sync: '+ method);
		return false;
	}
};

