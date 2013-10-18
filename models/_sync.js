var SyncError	=	extend_error(Error, 'SyncError');

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

	save: function()
	{
		var sync_time	=	this.get('sync_time');
		turtl.db.sync.update(
			{key: 'sync_time', value: sync_time}
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

		// run the local trackers individually
		this.local_trackers.each(function(track_obj) {
			track_obj.tracker.sync_from_db(last_local_sync);
		});

		this.sync_from_db.delay(1000, this);
	},

	/**
	 * Set up all the remote trackers we'll need.
	 */
	setup_remote_trackers: function()
	{
		var personas	=	new Personas();
		var boards		=	new Boards();
		var notes		=	new Notes();
		var user		=	new User();

		this.register_remote_tracker('user', user);
		this.register_remote_tracker('personas', personas);
		this.register_remote_tracker('boards', boards);
		this.register_remote_tracker('notes', notes);
	},

	/**
	 * Start remote syncing. This looks for data that has change in the local DB
	 * and syncs the changes out to the API. Also, it 
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
			var sync_time	=	this.get('sync_time', false);
			if(!sync_time)
			{
				console.log('Sync.sync_from_api: error starting API sync (bad sync time)');
				return false;
			}

			// schedule another sync (even if syncing is disabled)
			this.sync_from_api.delay(this.sync_from_api_delay, this);

			// if sync disabled, NEVERMIND
			if(!turtl.do_sync) return false;

			turtl.api.post('/sync', {time: sync_time}, {
				success: function(sync) {
					// save our last sync time (graciously provided by the
					// API)
					this.set({sync_time: sync.time});
					this.save();

					// pipe our sync data off to the respective remote
					// trackers
					this.remote_trackers.each(function(track_obj) {
						var type		=	track_obj.type;
						var tracker		=	track_obj.tracker;
						var syncdata	=	sync[type];
						if(!syncdata) return false;

						tracker.sync_from_api(turtl.db[tracker.local_table], syncdata);
					});
				}.bind(this),
				error: function(e, xhr) {
					if(xhr.status == 0)
					{
						barfr.barf('Error connecting with server. Your changes may note be saved.');
					}
					else
					{
						barfr.barf('Error syncing user profile with server: '+ e);
					}
					if(options.error) options.error(e);
				}
			});

			// sync user's persona messages. not super related to the sync
			// process since messages don't ever touch the main syncing
			// system, but this is as good a place as any to sync messages
			turtl.messages.sync();
		}.bind(this);

		// make sure we have a sync time before POST /sync
		var sync_time	=	this.get('sync_time', false);
		if(sync_time)
		{
			do_sync();
		}
		else
		{
			// hmmmmmmmmmmmmmmMMmmMmMm we don't have a sync time. see if we can
			// grab it from the local db
			turtl.db.sync.get('sync_time')
				.done(function(timerec) {
					this.set({sync_time: timerec.value});
					do_sync();
				}.bind(this))
				.fail(function(e) {
					barfr.barf('Error starting syncing: can\'t grab sync time: '+ e);
					console.log('Sync.sync_from_api: ', e);
				}.bind(this))
		}
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
	sync_from_db: function(last_local_sync)
	{
		// find all records in our owned table that were modified after the last
		// time we synced db -> mem and sync them to our in-memory models
		turtl.db[this.local_table].query('last_mod')
			.lowerBound(last_local_sync)
			.execute()
			.done(function(results) {
				results.each(function(result) {
					var model	=	this.find_by_id(result.id, {strict: true});
					if(!model && result.cid)
					{
						model	=	this.find_by_id(result.cid, {strict: true});
						// make sure we actually save the ID, even if
						// process_local_sync neglects to
						if(model) model.set({id: result.id}, {silent: true});
					}
					this.process_local_sync(result, model);
				}.bind(this));
			}.bind(this))
			.fail(function(e) {
				barfr.barf('Problem syncing '+ this.local_table +' records locally:' + e);
				console.log(this.local_table + '.sync_from_db: error: ', e);
			});
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

		// Well, well...Indian Jones. we got ourselves a CID. don't want to send
		// this to the save() function in the `id` field or it'll get mistaken
		// as an update (note an add).
		if(record.id.match(/^c[0-9]+$/))
		{
			record.cid	=	record.id;
			delete record.id;
		}

		// create a new instance of our collection's model
		var model	=	new this.model();

		// raw_data disables encryption/decryption (only the in-mem
		// models are going to need this, so we just stupidly pass
		// around encrypted payloads when syncing to/from the API).
		model.raw_data	=	true;

		// set our model to use the API sync function (instead of
		// Composer.sync)
		model.sync	=	api_sync;

		// save the record into the model
		model.set(record);

		// store whether or not we're deleting this model
		var is_delete	=	record.deleted == 1;

		// also store if we're adding a new model
		var is_create	=	model.is_new();

		var table	=	turtl.db[this.local_table];
		var options	=	{
			api_save: true,
			success: function(model) {
				// don't save the model back into the db if it's a delete
				if(is_delete) return;

				// the model may have changed during save, to serialize it and
				// put it back into the db
				var modeldata		=	model.toJSON();
				modeldata.last_mod	=	new Date().getTime();

				// saves the model into the database
				var run_update		=	function()
				{
					table.update(modeldata).fail(function(e) {
						console.log(this.local_table + '.sync_model_to_api: error setting last_mod on '+ this.local_table +'.'+ model.id() +' (local -> API): ', e);
					});
				};

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
					table.remove(record.cid)
						.done(function() {
							// save our cid
							modeldata.cid	=	record.cid;
							run_update();
						})
						.fail(function(e) {
							barfr.barf('Error removing stubbed record: '+this.local_table+'.'+model.id()+': '+ e)
							console.log(this.local_table +'.sync_model_to_api: error removing stubbed record: ', model.id(), e);
						});
				}
				else
				{
					run_update();
				}
			},
			error: function(_, err) {
				barfr.barf('Error syncing model to API: '+ err);
				// set the record as local_modified again so we can
				// try again next run
				table.get(options.model_key || model.id()).done(function(obj) {
					var errorfn	=	function(e)
					{
						console.log(this.local_table + '.sync_model_to_api: error marking object '+ this.local_table +'.'+ model.id() +' as local_change = true: ', e);
					};
					if(!obj) return errorfn();
					obj.local_change	=	1;
					table.update(obj).fail(errorfn);
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
				barfr.barf('Problem syncing '+ this.local_table +' records remotely:' + e);
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
		// loop over each of the synced items (this is a collection, remember)
		// and perform any standard data transformations before saving to the
		// local DB. update is the only operation we need.
		syncdata.each(function(item) {
			// POST /sync returns deleted === true, but we need it to be an int
			// value, so we either set it to 1 or just delete it.
			if(item.deleted)
			{
				item.deleted	=	1;
			}
			else
			{
				delete item.deleted;
			}

			// make sure the local "threads" know this data changed
			item.last_mod	=	new Date().getTime();

			// run the actual local DB update
			table.update(item);
		});
	}
});
