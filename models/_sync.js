var SyncError			=	extend_error(Error, 'SyncError');
var _sync_debug_list	=	['boards', 'notes', 'files'];

/**
 * Sync model, handles (almost) all syncing between the in-memory models, the
 * local DB, and the API.
 *
 * NOTE: there's currently a tight matching of names that's worth documenting:
 * The API's /sync call returns an object containing the changed items since
 * the last sync call. The keys in this object *must* match up to
 *   a) the local DB's table names for the respective objects and
 *   b) the registered trackers' "type" field
 */
var Sync = Composer.Model.extend({
	// time, in ms, between POST /sync calls
	sync_from_api_delay: 10000,

	time_track: {
		local: 0
	},

	// local model ID tracking (for preventing double syncs)
	sync_ignore: {
		local: [],
		remote: []
	},

	// holds collections/models that monitor their respective local db table for
	// remote changes and sync those changes to in-memory models. note that
	// local trackers also listen for changes that are made locally because this
	// allows syncing between different pieces of an addon (say, a background
	// process and an app tab). this circumvents the need to do forced API syncs
	// and cross-process eventing.
	local_trackers: [],

	// holds collections/models that monitor their respective local db table for
	// local changes and sync those changes to the API
	remote_trackers: [],

	init: function()
	{
		// initialize our time tracker(s)
		this.time_track.local	=	new Date().getTime();
	},

	/**
	 * Registers a collection/model that will keep in-memory models up-to-date
	 * with what's in the local DB.
	 *
	 * Generally, the collections/models registered here are the ones stored in
	 * turtl.profile (turtl.profile.(notes|boards|personas). Also, the model
	 * turtl.user will be added too.
	 */
	register_local_tracker: function(type, collection_or_model)
	{
		if(!collection_or_model.sync_from_db || typeof collection_or_model.sync_from_db != 'function')
		{
			throw new SyncError('Local tracker of type `'+ type +'` does not have `sync_from_db` function.');
		}
		this.local_trackers.push({type: type, tracker: collection_or_model});
	},

	/**
	 * Registers a collection/model that will
	 *  1. Push changes made locally out to the API
	 *  2. Take results from a sync call and apply the changes to the local DB
	 *
	 * The objects registered here will be completely different instances than
	 * the ones used to track local changes. This promotes the data separation
	 * needed to flow (most) data changes through the local DB without relying
	 * on tight coupling of the pieces involved.
	 */
	register_remote_tracker: function(type, collection_or_model)
	{
		if(!collection_or_model.sync_to_api || typeof collection_or_model.sync_to_api != 'function')
		{
			throw new SyncError('Remote tracker of type `'+ type +'` does not have `sync_to_api` function.');
		}
		if(!collection_or_model.sync_from_api || typeof collection_or_model.sync_from_api != 'function')
		{
			throw new SyncError('Remote tracker of type `'+ type +'` does not have `sync_from_api` function.');
		}
		this.remote_trackers.push({type: type, tracker: collection_or_model});
	},

	/**
	 * When a model saves itself into the DB, it sets its last_mod. this makes
	 * it so the data in the DB will be synced back into the model on the next
	 * DB -> mem sync, which is a) stupid and b) harmful (if the model has
	 * change between the last save and the sync).
	 *
	 * This function (mainly called by Composer.sync) tells the sync system to
	 * ignore a model on the next DB -> local sync. There is a slight chance
	 * that this will ignore remote data coming in, but that's a problem that
	 * can't be solved here and needs to be handled when saving.
	 */
	ignore_on_next_sync: function(id, options)
	{
		options || (options = {});
		if(!options.type) options.type = 'local';
		this.sync_ignore[options.type].push(id);
	},

	/**
	 * See ignore_on_next_sync() ...this is the function the sync processes use
	 * to determine if an item should be ignored.
	 */
	should_ignore: function(ids, options)
	{
		options || (options = {});
		if(!options.type) options.type = 'local';
		if(!(ids instanceof Array)) ids = [ids];
		var ignores	=	this.sync_ignore[options.type];
		for(var i = 0; i < ids.length; i++)
		{
			var id	=	ids[i];
			if(!id) continue;
			if(ignores.contains(id)) return true;
		}
		return false;
	},

	save: function()
	{
		var sync_id	=	this.get('sync_id');
		turtl.db.sync.update(
			{key: 'sync_id', value: sync_id}
		).fail(function(e) {
			console.log('Sync.save: problem persisting sync record: ', e);
		});
	},

	/**
	 * Start syncing locally. This means calling registered local trackers that
	 * will look for changes in the local DB and update their models
	 * accordingly.
	 */
	sync_from_db: function()
	{
		if(!turtl.user.logged_in) return false;

		// store last local sync time, update local sync time
		var last_local_sync	=	this.time_track.local;
		this.time_track.local	=	new Date().getTime();

		// called when all trackers complete
		var done	=	function()
		{
			this.sync_ignore.local.empty();
			this.sync_from_db.delay(1000, this);
		}.bind(this);

		// run the local trackers individually, making sure that one fully
		// completes its run before calling the next (due to the async nature of
		// indexeddb, this must be enforced explicitely here, we can't just run
		// them in order and hope for the best).
		var i	=	0;
		var next_tracker	=	function()
		{
			var track_obj	=	this.local_trackers[i];
			if(!track_obj) return done();
			i++;
			track_obj.tracker.sync_from_db(last_local_sync, {
				success: function() {
					next_tracker();
				},
				error: function() {
					next_tracker();
				}
			});
		}.bind(this);
		next_tracker();
	},

	/**
	 * Start remote syncing. This looks for data that has change in the local DB
	 * and syncs the changes out to the API.
	 *
	 * TODO: when proper cid/id matching is implemented, make sure a full sync
	 * from API is completed *before* doing sync_to_api.
	 */
	sync_to_api: function()
	{
		if(!turtl.user.logged_in) return false;

		if(turtl.do_sync)
		{
			this.remote_trackers.each(function(track_obj) {
				track_obj.tracker.sync_to_api();
			});
		}

		// async loop
		this.sync_to_api.delay(1000, this);
	},

	/**
	 * Calls the API's sync command, which downloads a list of things that have
	 * changed since the last sync. This list is then processed by the remote
	 * trackers (via their `sync_from_api` call) to update data in the local DB.
	 *
	 * TODO: when proper cid/id matching is implemented, make sure a full sync
	 * from API is completed *before* doing sync_to_api.
	 */
	sync_from_api: function()
	{
		if(!turtl.user.logged_in) return false;

		var do_sync	=	function()
		{
			var sync_id	=	this.get('sync_id', false);
			if(!sync_id)
			{
				console.log('Sync.sync_from_api: error starting API sync (bad initial sync ID)');
				return false;
			}

			// schedule another sync (even if syncing is disabled)
			this.sync_from_api.delay(this.sync_from_api_delay, this);

			// if sync disabled, NEVERMIND
			if(!turtl.do_sync || !turtl.do_remote_sync) return false;

			turtl.api.post('/sync', {sync_id: sync_id}, {
				success: function(sync) {
					// save our last sync id (graciously provided by the API)
					if(sync.sync_id) this.set({sync_id: sync.sync_id});
					this.save();

					// some nice debugging
					if(	(sync.keychain && sync.keychain.length > 0) ||
						(sync.personas && sync.personas.length > 0) ||
						(sync.boards && sync.boards.length > 0) ||
						(sync.notes && sync.notes.length > 0) ||
						(sync.user && sync.user.length > 0)
					)
					{
						var sync_clone	=	{};
						if(sync.user && sync.user.length > 0) sync_clone.user = sync.user.length;
						if(sync.keychain && sync.keychain.length > 0) sync_clone.keychain = sync.keychain.length;
						if(sync.personas && sync.personas.length > 0) sync_clone.personas = sync.personas.length;
						if(sync.boards && sync.boards.length > 0) sync_clone.boards = sync.boards.length;
						if(sync.notes && sync.notes.length > 0) sync_clone.notes = sync.notes.length;
						console.log('sync: ', JSON.encode(sync_clone));
					}


					// pipe our sync data off to the respective remote
					// trackers
					this.remote_trackers.each(function(track_obj) {
						var type		=	track_obj.type;
						var tracker		=	track_obj.tracker;
						var syncdata	=	sync[type];
						if(!syncdata || syncdata.length == 0) return false;

						tracker.sync_from_api(turtl.db[tracker.local_table], syncdata);
					});
				}.bind(this),
				error: function(e, xhr) {
					if(xhr.status == 0)
					{
						barfr.barf('Error connecting with server. Your changes may not be saved.');
					}
					else
					{
						barfr.barf('Error syncing user profile with server: '+ e);
					}
				}
			});

			// sync user's persona messages. not super related to the sync
			// process since messages don't ever touch the main syncing
			// system, but this is as good a place as any to sync messages
			turtl.messages.sync();
		}.bind(this);

		// make sure we have a sync time before POST /sync
		var sync_id	=	this.get('sync_id', false);
		if(sync_id)
		{
			do_sync();
		}
		else
		{
			// hmmmmmmmmmmmmmmMMmmMmMm we don't have a sync time. see if we can
			// grab it from the local db
			turtl.db.sync.get('sync_id')
				.done(function(timerec) {
					this.set({sync_id: timerec.value});
					do_sync();
				}.bind(this))
				.fail(function(e) {
					barfr.barf('Error starting syncing: can\'t grab sync id: '+ e);
					console.log('Sync.sync_from_api: ', e);
				}.bind(this))
		}
	},

	/**
	 * any data that comes from a remote source must first come through here.
	 * this function will run any needed updates on the data.
	 */
	process_data: function(data)
	{
		if(!data || !data.notes) return false;
		data.notes.each(function(note) {
			if(!note || !note.file || !note.file.hash) return
			note.has_file	=	1;
		});
		return data;
	}
});

/**
 * This collection abstracts most of the nittygritty nastiness that is dealing
 * with local <--> remote syncing. Most collections can just extend it, and only
 * implement process_local_sync themselves.
 *
 * However, in the event a collection needs finer-grained control over the sync
 * process, SyncCollection is designed to be broken into small enough pieces so
 * that control can be gained where needed by an extending collection without
 * throwing out all of the wonderful work SyncCollection does.
 */
var SyncCollection	=	Composer.Collection.extend({
	// stores the table in the local DB we operate on
	local_table: 'overrideme',

	/**
	 * Takes data from a local db => mem sync (sync_from_db) and updates any
	 * in-memory models/collections as needed. This is essentially what used to
	 * be Profile.process_sync().
	 */
	process_local_sync: function(sync_item_data, sync_model)
	{
		console.log(this.local_table + '.process_local_sync: You *really* want to extend me!');
	},

	/**
	 * Abstraction to create and set up a model with the sole purpose of using
	 * it API-sync-side (ie, not in-memory).
	 *
	 * This model will use raw data (no encryption/decryption...just stores what
	 * it's given and passes it out verbatim) and will use the api_sync function
	 * for remote syncing insteam of Composer.sync (see turtl/sync.js).
	 */
	create_remote_model: function(modeldata, options)
	{
		options || (options = {});

		if(options.destructive)
		{
			// we actually desire destructive changes to modeldata.
			var record	=	modeldata;
		}
		else
		{
			// clone the data so we don't destroy it.
			var record	=	Object.clone(modeldata);
		}

		// Well, well...Indiana Jones. we got ourselves a CID. don't want to
		// send this to the save() function in the `id` field or it'll get
		// mistaken as an update (not an add).
		if(record.id && record.id.match(/^c[0-9]+(\.[0-9]+)?$/))
		{
			record.cid	=	record.id;
			delete record.id;
		}

		// create a new instance of our collection's model
		var modelclass	=	options.model ? options.model : this.model;
		var model		=	new modelclass();

		// create a parse function that runs the model's data through the
		// standard sync parse function before applying into the model.
		model.parse	=	function(data)
		{
			var key			=	this.local_table;
			var process		=	{};
			process[key]	=	[data];
			process			=	turtl.sync.process_data(process);
			return process[key][0];
		}.bind(this);

		// raw_data disables encryption/decryption (only the in-mem
		// models are going to need this, so we just stupidly pass
		// around encrypted payloads when syncing to/from the API).
		model.raw_data	=	true;
		Object.each(model.relations, function(v, k) {
			// set raw data for each of the model's sub-objects
			model.get(k).raw_data	=	true;
		});

		// set our model to use the API sync function (instead of
		// Composer.sync)
		model.sync	=	api_sync;

		// match the model's CID to the records. this is a bit of a Composer
		// hack because two Composer objects should never share the same CID,
		// but who's going to stop me??
		if(record.cid) model._cid = record.cid;

		// save the record into the model
		model.set(record);

		return model;
	},

	/**
	 * This is called whenever an API update comes back that gives us a server-
	 * generated ID and we need to update that ID in the local DB to replace a
	 * CID. This generally happens after creating an object.
	 *
	 * Since we can't change an ID in indexedDB, we have to remove the record,
	 * then run whatever update contains the new ID.
	 *
	 * This function destructively modifies `modeldata` in order to set the
	 * `cid` key into it.
	 */
	cid_to_id_rename: function(modeldata, cid, options)
	{
		options || (options = {});

		var table	=	turtl.db[this.local_table];
		table.remove(cid)
			.done(function() {
				modeldata.cid	=	cid;
				var model		=	this.create_remote_model(modeldata);
				if(model.sync_post_create) model.sync_post_create();
				if(options.success) options.success();
			}.bind(this))
			.fail(options.error ? options.error : function() {});
	},

	/**
	 * Looks for data modified in the local DB (last_mod > last_local_sync) for
	 * this collection's table and syncs any changed data to in-memory models
	 * via `process_local_sync`.
	 *
	 * It tries to be smart about the model it pulls out. When a new model is
	 * added, it is added with a CID instead of an ID. When the API responds
	 * back with "thx, added" it gives us a real ID. We can match the real ID to
	 * the CID by trying to pull out the model by CID (if we don't find it by
	 * the given ID).
	 */
	sync_from_db: function(last_local_sync, options)
	{
		options || (options = {});

		// find all records in our owned table that were modified after the last
		// time we synced db -> mem and sync them to our in-memory models
		turtl.db[this.local_table].query('last_mod')
			.lowerBound(last_local_sync)
			.execute()
			.done(function(results) {
				results.each(function(result) {
					// check if we're ignoring this item
					if(turtl.sync.should_ignore([result.id], {type: 'local'})) return false;

					// try to find the model locally (using both the ID and CID)
					var model	=	this.find_by_id(result.id, {strict: true});
					if(!model && result.cid)
					{
						model	=	this.find_by_id(result.cid, {strict: true});
						// make sure we actually save the ID, even if
						// process_local_sync neglects to
						if(model) model.set({id: result.id}, {silent: true});
					}
					//console.log(this.local_table + '.sync_from_db: process: ', result, model);
					this.process_local_sync(result, model);
				}.bind(this));
				if(options.success) options.success();
			}.bind(this))
			.fail(function(e) {
				barfr.barf('Problem syncing '+ this.local_table +' records locally:' + e);
				console.log(this.local_table + '.sync_from_db: error: ', e);
				if(options.error) options.error();
			}.bind(this));
	},

	/**
	 * Wrapper around the internal section of sync_record_to_api which allows us
	 * to override the save behavior on a per-remote-model basis. For instance,
	 * the FileData model syncs with the API directly, but doesn't save its
	 * results into the "files" table, it just updates the note record it's
	 * attached to. This function allows custom behavior like this.
	 *
	 * Called by sync_record_to_api
	 */
	update_record_from_api_save: function(modeldata, record, options)
	{
		var table		=	turtl.db[this.local_table];
		var is_create	=	options.is_create;
		var is_delete	=	options.is_delete;

		// saves the model into the database
		var run_update	=	function()
		{
			//console.log(this.local_table + '.sync_record_to_api: got: ', modeldata);
			if(_sync_debug_list.contains(this.local_table))
			{
				console.log('save: '+ this.local_table +': api -> db ', modeldata);
			}
			table.update(modeldata)
				.done(function() { if(options.success) options.success(); })
				.fail(function(e) { if(options.error) options.error(e); });
		}.bind(this);

		if(is_create)
		{
			// if the record was just added, we have a new ID for it
			// from the API, however we can't change the id of our
			// current record, so we have to delete it, mark the new
			// model data with the original cid, and then add the new
			// record into the db.
			//
			// when the local sync process finds the record, it will
			// check not only the id, but the cid when trying to match
			// it to a model.
			this.cid_to_id_rename(modeldata, record.cid, {
				success: function() {
					run_update();
				},
				error: function(e) {
					barfr.barf('Error removing stubbed record: '+this.local_table+'.'+model.id()+': '+ e)
					console.log(this.local_table +'.sync_model_to_api: error removing stubbed record: ', model.id(), e);
				}.bind(this)
			});
		}
		else
		{
			run_update();
		}
	},

	/**
	 * Given an individual local DB record object, creates a model from the
	 * record and syncs that model to the API.
	 *
	 * Called mainly by sync_to_api.
	 */
	sync_record_to_api: function(record, options)
	{
		options || (options = {});

		// create a model suited for DB <--> API tasks
		var model	=	this.create_remote_model(record, {destructive: true});

		// store whether or not we're deleting this model
		var is_delete	=	record.deleted == 1;

		// also store if we're adding a new model
		var is_create	=	model.is_new();

		if(_sync_debug_list.contains(this.local_table))
		{
			var action	=	is_delete ? 'delete' : (is_create ? 'add' : 'edit');
			console.log('sync: '+ this.local_table +': db -> api ('+action+') (new: '+model.is_new()+')');
		}

		var table	=	turtl.db[this.local_table];
		var _model = model;
		var options	=	{
			api_save: true,
			success: function(model, res) {
				// don't save the model back into the db if it's a delete
				if(is_delete) return;

				// the model may have changed during save, to serialize it and
				// put it back into the db
				var modeldata		=	model.toJSON();
				modeldata.last_mod	=	new Date().getTime();

				// make sure synced k/v items have their primary key (aka the
				// User model)
				if(record.key) modeldata.key = record.key;

				this.update_record_from_api_save(modeldata, record, {
					is_create: is_create,
					is_delete: is_delete,
					success: function() {},
					error: function(e) {
						console.log(this.local_table + '.sync_model_to_api: error saving model in '+ this.local_table +'.'+ model.id() +' (local -> API): ', e);
					}
				});

			}.bind(this),
			error: function(xhr, err) {
				barfr.barf('Error syncing model to API: '+ err);
				// set the record as local_modified again so we can
				// try again next run
				table.get(options.model_key || model.id()).done(function(obj) {
					var errorfn	=	function(e)
					{
						console.log(this.local_table + '.sync_model_to_api: error marking object '+ this.local_table +'.'+ model.id() +' as local_change = true: ', e);
					}.bind(this);
					if(!obj) return errorfn('missing obj');
					if(xhr && xhr.status >= 500)
					{
						// internal server error. just try again in a bit.
						(function() {
							obj.local_change	=	1;
							table.update(obj).fail(errorfn);
						}).delay(30000, this);
					}
					else
					{
						// TODO: possibly delete local object??
						console.log('sync_record_to_api: either remote object doesn\'t exist or we don\'t have access. giving up!'); 
					}
				});
			}.bind(this)
		};

		if(is_delete)
		{
			model.destroy(options);
		}
		else
		{
			model.save(options);
		}
	},

	/**
	 * Looks for data in the local DB (under our table) that has been marked as
	 * changed locally (local_change=1). Takes all found records, atomically
	 * sets local_change=0, and calls sync_record_to_api on each.
	 *
	 * Also, this function searches its tables for records that have been marked
	 * as deleted (deleted=1) and if their local_mod is more than 10s ago, they
	 * are permenently removed. The 10s delay allows other pieces of the client
	 * to process their deletion before the record is lost permenently.
	 */
	sync_to_api: function()
	{
		var table	=	turtl.db[this.local_table];

		// grab objects that have been modified locally, atomically set their
		// modified flag to false, and sync them out to the API.
		table.query('local_change')
			.only(1)
			.modify({local_change: 0})
			.execute()
			.done(function(results) {
				results.each(this.sync_record_to_api.bind(this));
			}.bind(this))
			.fail(function(e) {
				barfr.barf('Problem syncing '+ this.local_table +' records remotely:' + e.target.error.name +': '+ e.target.error.message);
				console.log(this.local_table + '.sync_to_api: error: ', e);
			});

		// remove any records marked as "deleted" more than 10s ago
		table.query('deleted')
			.only(1)
			.execute()
			.done(function(results) {
				var now	=	new Date().getTime();
				results.each(function(record) {
					// only remove deleted items if they were deleted more than
					// 10s ago
					if(now - record.last_mod < 10000) return false;

					table.remove(record.id).fail(function(e) {
						console.log(this.local_table + '.sync_to_api: error removing deleted record: ', e);
					})
				}.bind(this));
			}.bind(this))
			.fail(function(e) {
				console.log(this.local_table + '.sync_to_api: error removing deleted records: ', e);
			});
	},

	/**
	 * This function takes items from a POST /sync call and saves them to the
	 * local DB. POST /sync objects are full representations (not just diffs) so
	 * saving them to the local DB fully is ok.
	 */
	sync_from_api: function(table, syncdata)
	{
		// process the sync data
		var process	=	{};
		process[this.local_table]	=	syncdata;
		syncdata	=	turtl.sync.process_data(process)[this.local_table];

		// loop over each of the synced items (this is a collection, remember)
		// and perform any standard data transformations before saving to the
		// local DB. update is the only operation we need.
		syncdata.each(function(item) {
			// check if this item has an ignored sync_id (if yes, this sync
			// record is from something just did, and we don't need to re-apply
			// changes we already made...in fact, doing so can cause problems
			// such as race conditions).
			try
			{
				if(turtl.sync.should_ignore(item._sync.id, {type: 'remote'})) return false;
			}
			catch(e)
			{
				turtl.do_sync=false;
				throw e;
			}

			var do_sync	=	function()
			{
				if(_sync_debug_list.contains(this.local_table))
				{
					console.log('sync: '+ this.local_table +': api -> db ('+ item._sync.action +')');
				}

				// POST /sync returns deleted === true, but we need it to be an int
				// value (IDB don't like filtering bools), so we either set it to 1
				// or just delete it.
				if(item.deleted) item.deleted = 1;
				else delete item.deleted;

				// make sure the local "threads" know this data changed
				item.last_mod	=	new Date().getTime();

				// if we have sync data (we definitely should), move some of the
				// data into the actual item object we save, then obliterate the
				// _sync key so it never touches the local db
				if(item._sync)
				{
					// move the CID into the item if we have it.
					if(item._sync.cid) item.cid = item._sync.cid;
					delete item._sync;
				}

				// run the actual local DB update
				table.update(item);
			}.bind(this);

			if(item._sync && item._sync.cid)
			{
				// we have a CID. check our table for a record with an ID
				// matching the CID. if found, delete the record and recreate it
				// with the actual id (replacing the CID)
				table.get(item._sync.cid)
					.done(function(record) {
						if(!record)
						{
							do_sync();
						}
						else
						{
							this.cid_to_id_rename(item, item._sync.cid, {
								success: function() {
									do_sync();
								},
								error: function(e) {
									console.log('sync: '+ this.local_table +': api -> db: error updating CID -> ID (remove '+ item._sync.cid +')');
									// keep going anyway
									do_sync();
								}.bind(this)
							});
						}
					})
					.fail(function(e) {
						console.log('sync: '+ this.local_table +': api -> db: error updating CID -> ID (get '+ item._sync.cid +')');
						// keep going anyway
						do_sync();
					});
			}
			else
			{
				// no cid, run the sync normally
				do_sync();
			}
		}.bind(this));
	}
});

