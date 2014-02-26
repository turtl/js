var SyncError			=	extend_error(Error, 'SyncError');
var _sync_debug_list	=	['notes', 'files', 'boards'];

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

	// if false, syncing functions will no longer run
	enabled: false,

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

	// used to track local syncs
	local_sync_id: 0,

	init: function()
	{
		// initialize our time tracker(s)
		this.time_track.local	=	new Date().getTime();
	},

	/**
	 * Instruct the syncing system to start
	 */
	start: function()
	{
		this.enabled	=	true;
	},

	/**
	 */
	stop: function()
	{
		this.enabled	=	false;
	},

	/**
	 * Registers a collection/model that will keep in-memory models up-to-date
	 * with what's in the local DB.
	 *
	 * Generally, the collections/models registered here are the ones stored in
	 * turtl.profile (turtl.profile.(notes|boards|personas). Also, the model
	 * turtl.user will be added too.
	 */
	register_local_tracker: function(type, collection)
	{
		if(!collection.sync_record_from_db || typeof collection.sync_record_from_db != 'function')
		{
			throw new SyncError('Local tracker of type `'+ type +'` does not have `sync_record_from_db` function.');
		}
		this.local_trackers.push({type: type, tracker: collection});
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
	register_remote_tracker: function(type, collection)
	{
		if(!collection.sync_record_to_api || typeof collection.sync_record_to_api != 'function')
		{
			throw new SyncError('Remote tracker of type `'+ type +'` does not have `sync_record_to_api` function.');
		}
		if(!collection.sync_from_api || typeof collection.sync_from_api != 'function')
		{
			throw new SyncError('Remote tracker of type `'+ type +'` does not have `sync_from_api` function.');
		}
		this.remote_trackers.push({type: type, tracker: collection});
	},

	/**
	 * This function (mainly called by Composer.sync) tells the sync system to
	 * ignore a model on the next sync.
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
			if(!id && id !== 0) continue;
			if(ignores.contains(id))
			{
				log.debug('sync: ignore: '+ options.type, id);
				ignores.erase(id);
				return true;
			}
		}
		return false;
	},

	/**
	 * Persist the sync state. This lets us pick up where we left off when a
	 * client closes and re-opens later, grabbing all changes that occurred
	 * inbetween.
	 */
	save: function()
	{
		var sync_id	=	this.get('sync_id');
		turtl.db.sync.update(
			{key: 'sync_id', value: sync_id}
		).fail(function(e) {
			log.error('Sync.save: problem persisting sync record: ', e);
		});
	},

	/**
	 * Notify all listening parties that an item's data has changed and should
	 * be updated in-memory.
	 */
	notify_local_change: function(table, action, data, options)
	{
		options || (options = {});

		var msg	=	{
			sync_id: this.local_sync_id++,
			type: table,
			action: action,
			data: data
		};

		// don't want to blast out file content willy nilly since it's pretty
		// big and we only ever update files in-mem by pulling directly from the
		// DB newayz
		if(table == 'files')
		{
			var data	=	Object.clone(msg.data);
			delete data.body;
			msg.data	=	data;
		}

		if(options.track)
		{
			this.ignore_on_next_sync(msg.sync_id, {type: 'local'});
		}

		var fail_count	=	0;
		var notify	=	function()
		{
			turtl.hustle.Pubsub.publish('local-changes', msg, {
				success: function() {
					log.debug('sync: notify local: send: ', msg);
				},
				error: function(e) {
					// this is what happens when you're not a *fucking* local
					log.error('sync: notify local: error ', e);
					fail_count++;
					if(fail_count < 3) notify.delay(100, this);
				}
			})
		};
		notify();
	},

	/**
	 * Notify the syncing system that data has changed locally and needs to be
	 * synced to the API.
	 */
	queue_remote_change: function(table, action, data)
	{
		var msg	=	{
			type: table,
			action: action,
			data: data
		};
		var fail_count	=	0;
		var enqueue	=	function()
		{
			turtl.hustle.Queue.put(msg, {
				tube: 'outgoing',
				success: function() {
					log.debug('sync: queue remote: send: ', msg);
				},
				error: function(e) {
					log.error('sync: queue remote: error: ', e);
					fail_count++;
					if(fail_count < 3) enqueue.delay(100, this);
				}
			});
		};
		enqueue();
	},

	/**
	 * Listen for changes to our local data. These get fired whenever anything
	 * touches the database.
	 */
	sync_from_db: function()
	{
		if(!turtl.user.logged_in || !this.enabled) return false;

		var get_tracker	=	function(type)
		{
			for(var i = 0, n = this.local_trackers.length; i < n; i++)
			{
				if(this.local_trackers[i].type == type) return this.local_trackers[i];
			}
		}.bind(this);

		var subscriber	=	new turtl.hustle.Pubsub.Subscriber('local-changes', function(msg) {
			var track_obj	=	get_tracker(msg.data.type);
			if(!track_obj) return;
			log.debug('sync: notify local: recv: ', msg);
			track_obj.tracker.sync_record_from_db(msg.data.data, msg.data);
		}, {
			enable_fn: function() {
				return turtl.user.logged_in && this.enabled;
			}.bind(this),
			error: function(e) {
				log.error('sync: sync_from_db: subscriber: error: ', e);
			}
		});
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
		if(!turtl.user.logged_in || !this.enabled) return false;

		if(!turtl.do_sync) return false;

		var get_tracker	=	function(type)
		{
			for(var i = 0, n = this.remote_trackers.length; i < n; i++)
			{
				if(this.remote_trackers[i].type == type) return this.remote_trackers[i];
			}
		}.bind(this);

		var consumer	=	turtl.hustle.Queue.Consumer(function(item) {
			var track_obj	=	get_tracker(item.data.type);
			if(!track_obj) return;
			log.debug('sync: queue remote: recv: ', item);
			track_obj.tracker.sync_record_to_api(item.data.data, item);
		}, {
			tube: 'outgoing',
			enable_fn: function() {
				return turtl.user.logged_in && this.enabled && turtl.do_sync;
			}.bind(this),
			error: function(e) {
				log.error('sync: sync_to_api: consumer: error: ', e);
			}
		});
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
		if(!turtl.user.logged_in || !this.enabled) return false;

		var do_sync	=	function()
		{
			var sync_id	=	this.get('sync_id', false);
			if(!sync_id)
			{
				log.error('Sync.sync_from_api: error starting API sync (bad initial sync ID)');
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
						(sync.files && sync.files.length > 0) ||
						(sync.user && sync.user.length > 0)
					)
					{
						var sync_clone	=	{};
						if(sync.user && sync.user.length > 0) sync_clone.user = sync.user.length;
						if(sync.keychain && sync.keychain.length > 0) sync_clone.keychain = sync.keychain.length;
						if(sync.personas && sync.personas.length > 0) sync_clone.personas = sync.personas.length;
						if(sync.boards && sync.boards.length > 0) sync_clone.boards = sync.boards.length;
						if(sync.notes && sync.notes.length > 0) sync_clone.notes = sync.notes.length;
						if(sync.files && sync.files.length > 0) sync_clone.files = sync.files.length;
						log.info('sync: ', JSON.encode(sync_clone));
					}


					// pipe our sync data off to the respective remote
					// trackers
					this.remote_trackers.each(function(track_obj) {
						var type		=	track_obj.type;
						var tracker		=	track_obj.tracker;
						var syncdata	=	sync[type];
						if(!syncdata || syncdata.length == 0) return false;

						tracker.sync_from_api(syncdata);
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
					log.error('Sync.sync_from_api: ', e);
				}.bind(this))
		}
	},

	/**
	 * any data that comes from a remote source must first come through here.
	 * this function will run any needed updates on the data.
	 */
	process_data: function(data)
	{
		if(!data) return data;

		var board_idx	=	{};
		var persona_idx	=	{};

		// used to create id => object indexes generically. note that this pulls
		// both from the passed data *and* a passed collection (which is
		// generally the turtl.profile matching collection).
		var make_idx	=	function(index, collection, name)
		{
			if(turtl.profile && collection)
			{
				collection.each(function(item) {
					index[item.id()]	=	item.toJSON();
				});
			}
			if(data && data[name])
			{
				data[name].each(function(item) {
					index[item.id]	=	item;
				});
			}
		};

		// index our data, also indexing the global data in the user's profile.
		// this helps us make some decisions below with how to set certain meta
		// data in the given objects.
		make_idx(persona_idx, turtl.user.get('personas'), 'personas');
		make_idx(board_idx, turtl.profile.get('boards'), 'boards');

		if(data.boards)
		{
			// set board.shared, and set board.meta.persona
			var user_id	=	turtl.user.id();
			data.boards.each(function(board) {
				if(board.user_id != user_id)
				{
					board.shared	=	true;

					// loop over each share in the board's data, noting the
					// user's persona that has the highest ranking privs in the
					// board.
					//
					// we then set this persona into board.meta.persona (if it
					// exists).
					if(board.privs)
					{
						var perms		=	0;
						var the_persona	=	false;
						Object.keys(persona_idx).each(function(pid) {
							if(!board.privs[pid]) return;
							var this_privs	=	board.privs[pid].perms;
							if(this_privs > perms)
							{
								the_persona	=	pid;
								perms		=	this_privs;
							}
						});
						if(the_persona)
						{
							if(!board.meta) board.meta = {};
							board.meta.persona	=	the_persona;
						}
					}
				}
			});
		}

		if(data.notes)
		{
			data.notes.each(function(note) {
				// set note.meta.persona based on owning board's meta.persona
				var board	=	board_idx[note.board_id];
				if(board && board.meta && board.meta.persona)
				{
					if(!note.meta) note.meta = {};
					note.meta.persona	=	board.meta.persona;
				}

				// make sure if we have file data, we have has_file = 1
				if(note && note.file && note.file.hash)
				{
					note.has_file	=	1;

					// check in-mem notes for has_data value
					var note_mem		=	turtl.profile.get('notes').find_by_id(note.id);
					var has_data		=	note_mem && note_mem.get('file').get('has_data');
					note.file.has_data	=	has_data;
				}
			});
		}
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
	 * in-memory models/collections as needed.
	 */
	process_local_sync: function(item_data, model, msg)
	{
		var action	=	msg.action;
		if(_sync_debug_list.contains(this.local_table))
		{
			log.debug('sync: process_local_sync: '+ this.local_table +': '+ action, item_data, model);
		}

		if(action == 'deleted')
		{
			if(model) model.destroy({skip_local_sync: true, skip_remote_sync: true});
		}
		else if(model)
		{
			model.set(item_data);
		}
		else
		{
			var model	=	new this.model(item_data);
			if(item_data.cid) model._cid = item_data.cid;
			this.upsert(model);
		}
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
			if(!data) return data;
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
			var submodel	=	model.get(k);
			if(!submodel) return false;
			submodel.raw_data	=	true;
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
	 * Applies the changes from the DB to a single in-memory record
	 */
	sync_record_from_db: function(result, msg)
	{
		// check if we're ignoring this item
		if(turtl.sync.should_ignore([msg.sync_id], {type: 'local'})) return false;

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
		if(_sync_debug_list.contains(this.local_table))
		{
			log.debug('sync: '+ this.local_table +': db -> mem ('+ (result.deleted ? 'delete' : 'add/edit') +')');
		}
		this.process_local_sync(result, model, msg);
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
		var action		=	options.action;

		// saves the model into the database
		var run_update	=	function()
		{
			//console.log(this.local_table + '.sync_record_to_api: got: ', modeldata);
			if(_sync_debug_list.contains(this.local_table))
			{
				log.debug('save: '+ this.local_table +': api -> db ', modeldata);
			}
			table.update(modeldata)
				.done(function() { if(options.success) options.success(); })
				.fail(function(e) { if(options.error) options.error(e); });
		}.bind(this);

		if(action == 'create')
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
					log.error(this.local_table +'.sync_model_to_api: error removing stubbed record: ', model.id(), e);
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
	sync_record_to_api: function(record, queue_item, options)
	{
		options || (options = {});

		// create a model suited for DB <--> API tasks
		var model	=	this.create_remote_model(record, {destructive: true});
		var action	=	queue_item.data.action;

		if(_sync_debug_list.contains(this.local_table))
		{
			log.debug('sync: '+ this.local_table +': db -> api ('+action+') (new: '+model.is_new()+')');
		}

		var table	=	turtl.db[this.local_table];
		var options	=	{
			api_save: true,
			success: function(model, res) {
				// don't save the model back into the db if it's a delete
				if(action == 'delete') return;

				// the model may have changed during save, to serialize it and
				// put it back into the db
				var modeldata		=	model.toJSON();

				// make sure synced k/v items have their primary key (aka the
				// User model)
				if(record.key) modeldata.key = record.key;

				this.update_record_from_api_save(modeldata, record, {
					action: action,
					success: function() {
						turtl.sync.notify_local_change(this.local_table, 'update', modeldata);
					}.bind(this),
					error: function(e) {
						log.error(this.local_table + '.sync_model_to_api: error saving model in '+ this.local_table +'.'+ model.id() +' (local -> API): ', e);
					}
				});

			}.bind(this),
			error: function(xhr, err) {
				barfr.barf('Error syncing model to API: '+ err);
				// set the record as local_modified again so we can
				// try again next run
				table.get(options.model_key || model.id()).done(function(obj) {
					if(!obj) return errorfn('missing obj');
					if(xhr && xhr.status >= 500)
					{
						hustle.Queue.release(queue_item.id, {
							delay: 10,
							error: function(e) {
								log.error('sync_record_to_api: error releasing queue item: ', queue_item);
							}
						});
					}
					else
					{
						// TODO: possibly delete local object??
						log.warn('sync_record_to_api: either remote object doesn\'t exist or we don\'t have access. giving up!'); 
					}
				});
			}.bind(this)
		};

		if(action == 'delete')
		{
			model.destroy(options);
		}
		else
		{
			model.save(options);
		}
	},

	/**
	 * Run the actual save for a single item from a remote sync call.
	 */
	sync_record_from_api: function(item)
	{
		console.log('SRFAPI: ', item);
		var table	=	turtl.db[this.local_table];
		if(_sync_debug_list.contains(this.local_table))
		{
			log.debug('sync: '+ this.local_table +': api -> db ('+ item._sync.action +')');
		}

		var action	=	'update';

		if(item.deleted)
		{
			table.remove(item.id);
			action	=	'delete';
		}
		else
		{
			// if we have sync data (we definitely should), move some of the
			// data into the actual item object we save, then obliterate the
			// _sync key so it never touches the local db
			if(item._sync)
			{
				// move the CID into the item if we have it.
				if(item._sync.cid) item.cid = item._sync.cid;
				delete item._sync;
				action	=	'create';
			}

			// run the actual local DB update
			table.update(item);

			turtl.sync.notify_local_change(this.local_table, action, item);
		}
	},

	/**
	 * This function takes items from a POST /sync call and saves them to the
	 * local DB. POST /sync objects are full representations (not just diffs) so
	 * saving them to the local DB fully is ok.
	 */
	sync_from_api: function(syncdata)
	{
		// process the sync data
		var process	=	{};
		process[this.local_table]	=	syncdata;
		syncdata	=	turtl.sync.process_data(process)[this.local_table];

		// loop over each of the synced items (this is a collection, remember)
		// and perform any standard data transformations before saving to the
		// local DB. update is the only operation we need.
		syncdata.each(function(item) {
			var table	=	turtl.db[this.local_table];

			// check if this item has an ignored sync_id (if yes, this sync
			// record is from something just did, and we don't need to re-apply
			// changes we already made...in fact, doing so can cause problems
			// such as race conditions).
			if(turtl.sync.should_ignore(item._sync.id, {type: 'remote'})) return false;

			// just create a forward to sync_record_from_api
			var do_sync	=	function() { this.sync_record_from_api(item); }.bind(this);

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
									log.error('sync: '+ this.local_table +': api -> db: error updating CID -> ID (remove '+ item._sync.cid +')');
									// keep going anyway
									do_sync();
								}.bind(this)
							});
						}
					})
					.fail(function(e) {
						log.error('sync: '+ this.local_table +': api -> db: error updating CID -> ID (get '+ item._sync.cid +')');
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

