// extend_error is in functions.js
var SyncError = extend_error(Error, 'SyncError');

/**
 * Default sync function, persists items to the local DB
 */
Composer.sync = function(method, model, options)
{
	options || (options = {});
	if(options.skip_local_sync && method == 'delete')
	{
		if(options.success) options.success();
		return;
	}

	// derive the table name from the model's base_url field.
	var table = options.table || model.get_url().replace(/^\/(.*?)(\/|$).*/, '$1');
	if(table == 'users') table = 'user';	// kind of a hack. oh well.

	// some debugging, can make tracking down sync issues easier
	var action = method == 'delete' ? 'delete' : (method == 'create' ? 'add' : 'edit');
	var skip_remote = options.skip_remote_sync ? ', skip remote' : '';
	log.info('model: save: '+ table +': mem -> db ('+ action + skip_remote +')');

	var error = options.error || function() {};
	if(!turtl.db)
	{
		return error('DB not open.');
	}
	if(!turtl.db[table])
	{
		throw new SyncError('Bad db.js table: '+ table);
	}

	var id = model.id();
	var modeldata = null;

	// define some callbacks for our indexeddb queries
	var success = function(res)
	{
		if(['create', 'update', 'delete'].contains(method))
		{
			if(options.skip_local_sync)
			{
				log.warn('sync: using deprecated sync option: skip_local_sync');
			}
			if(!options.skip_remote_sync)
			{
				var sync_data = modeldata;

				// if we're deleting, all we need is an ID
				if(method == 'delete')
				{
					// files are special, because we want to look up the note by
					// note id, not file id, when performing operations
					if(table == 'files') sync_data = {id: model.get('note_id')};
					// not a file? just use the regular id
					else sync_data = {id: id};
				}

				// if this is a file sync, we don't want to pass the file data
				// through the outgoing queue (this gets handled by the file
				// handler later on in the sync process)
				if(table == 'files') delete sync_data.body;

				// let sync know we have an outgoing change!
				turtl.sync.queue_outgoing_change(table, method, sync_data);
			}
		}

		if(res instanceof Array && res.length == 1)
		{
			res = res[0];
		}
		if(options.success) options.success(res);
	};

	var do_sync = function()
	{
		var promise = Promise.resolve();

		if(options.skip_serialize)
		{
			// model was pre-serialized
			promise = Promise.resolve([model.safe_json()]);
		}
		else if(!['read', 'delete'].contains(method))
		{
			// serialize our model, and add in any extra data needed
			promise = model.serialize();
		}

		return promise
			.spread(function(serialized) {
				if(serialized) modeldata = serialized;
				if(modeldata && options.args) modeldata.meta = options.args;
				// any k/v data that doesn't go by the "id" field should have it's key field
				// filled in here.
				if(table == 'user')
				{
					modeldata.key = 'user';
				}

				switch(method)
				{
				case 'read':
					turtl.db[table].get(model.id()).then(success).catch(error);
					break;
				case 'create':
					model.set({id: model.cid()}, {silent: true});
					modeldata.id = model.id();

					turtl.db[table].add(modeldata).then(success).catch(error);
					break;
				case 'delete':
					turtl.db[table].remove(model.id()).then(success).catch(error);
					break;
				case 'update':
					turtl.db[table].update(modeldata).then(success).catch(error);
					break;
				default:
					throw new SyncError('Bad method passed to Composer.sync: '+ method);
					return false;
				}
				log.debug('save: '+ table +': '+ method, modeldata);
			})
			.catch(function(err) {
				log.error('sync: ', method, err, table, model.id());
				throw err;
			});
	}.bind(this);

	// if we're changing the password, delay any fetches/saves until we're
	// finished. this ensures we don't cross wires when changing keys. we really
	// only need to do this for keychain but i like to err on the side
	// of safety when it comes to this stuff.
	if(turtl.user.changing_password)
	{
		// wait until password change operationis done
		return new Promise(function(resolve) {
			turtl.events.bind_once('user:change-password:finish', function() {
				resolve(do_sync());
			});
		});
	}
	else
	{
		return do_sync();
	}
};

var RemoteSync = function(action, model, options) {
	var method = 'get';
	switch(action) {
		case 'create': method = 'post'; break;
		case 'update': method = 'put'; break;
		case 'delete': method = '_delete'; break;
	};

	var data = null;
	if(['create', 'update'].indexOf(action) >= 0) {
		data = model.safe_json();
	}

	return turtl.api[method](model.url(), data, options)
		.then(options.success)
		.catch(options.error);
};

