"use strict";
var Sync = Composer.Model.extend({
	// local model ID tracking (for preventing double syncs)
	sync_ignore: {},

	// if false, syncing functions will no longer run
	enabled: false,

	// some polling vars
	connected: true,
	_polling: false,
	_outgoing_sync_running: false,

	// holds collections that are responsible for handling incoming data syncs
	// from the API
	local_trackers: {},

	outgoing_timer: null,
	outgoing_interval: null,

	// used to track local syncs
	local_sync_id: 0,

	type_table_map: {
		user: 'user',
		keychain: 'keychain',
		persona: 'personas',
		board: 'boards',
		note: 'notes',
		file: 'files'
	},

	// generated from the above
	table_type_map: {},

	initialize: function()
	{
		Object.keys(this.type_table_map).forEach(function(key) {
			this.table_type_map[this.type_table_map[key]] = key;
		}.bind(this));
		return this.parent();
	},

	/**
	 * Instruct the syncing system to start
	 */
	start: function()
	{
		this.enabled = true;
		this.start_remote_poll();
		this.sync_files();

		this.outgoing_timer = new Timer(2000);
		this.outgoing_timer.bind('fired', this.run_outgoing_sync.bind(this));
		this.outgoing_timer.bind('fired', function() {
			if(!this.connected) return;
			this.run_outgoing_sync();
		}.bind(this));
		this.bind('mem->db', this.outgoing_timer.reset.bind(this.outgoing_timer), 'sync:model:mem->db');
		turtl.events.bind('api:connect', this.outgoing_timer.reset.bind(this.outgoing_timer), 'sync:connect:run-outgoing');

		// runs our initial outgoing sync
		this.outgoing_timer.reset();
		// make sure outgoing sync runs at least once every 10s
		this.outgoing_interval = setInterval(this.run_outgoing_sync.bind(this), 10000);
	},

	/**
	 * Instruct the syncing system to stop
	 */
	stop: function()
	{
		this.enabled = false;

		if(this.outgoing_timer) this.outgoing_timer.unbind();
		this.outgoing_timer = null;
		this.unbind('mem->db', 'sync:model:mem->db');
		turtl.events.unbind('api:connect', 'sync:connect:run-outgoing');
		clearInterval(this.outgoing_interval);
	},

	/**
	 * setup up a name -> collection maping that takes changes from the database
	 * and syncs them to the respective in-mem data
	 */
	register_local_tracker: function(name, tracker)
	{
		this.local_trackers[name] = tracker;
	},

	/**
	 * This function (mainly called by Composer.sync) tells the sync system to
	 * ignore a model on the next sync.
	 */
	ignore_on_next_sync: function(id)
	{
		this.sync_ignore[id] = true;
	},

	/**
	 * See ignore_on_next_sync() ...this is the function the sync processes use
	 * to determine if an item should be ignored.
	 */
	should_ignore: function(ids)
	{
		if(!(ids instanceof Array)) ids = [ids];
		var ignores = this.sync_ignore;
		var num_ignored = 0;
		for(var i = 0; i < ids.length; i++)
		{
			var id = ids[i];
			if(!id && id !== 0) continue;
			if(ignores[id] === true)
			{
				log.info('sync: ignore: ', id);
				delete ignores[id];
				num_ignored++;
			}
		}
		return num_ignored;
	},

	/**
	 * Persist the sync state. This lets us pick up where we left off when a
	 * client closes and re-opens later, grabbing all changes that occurred
	 * inbetween.
	 */
	save: function()
	{
		if(!turtl.db || !turtl.db.sync) return false;

		var sync_id = this.get('sync_id');
		turtl.db.sync.update(
			{key: 'sync_id', value: sync_id}
		).catch(function(err) {
			log.error('Sync.save: problem persisting sync record: ', derr(err));
		});
	},

	/**
	 * Notify the syncing system that data has changed locally and needs to be
	 * synced to the API.
	 */
	queue_outgoing_change: function(table, action, data)
	{
		var sync_action;
		switch(action)
		{
			case 'create': sync_action = 'add'; break;
			case 'update': sync_action = 'edit'; break;
			case 'delete': sync_action = 'delete'; break;
			default: throw new Error('sync: queue outgoing change: bad action given: '+ action); break;
		}
		var sync = {
			type: this.table_to_type(table),
			action: sync_action,
			data: data
		};
		var fail_count = 0;
		var enqueue = function()
		{
			turtl.db.sync_outgoing.add(sync).bind(this)
				.then(function() {
					log.debug('sync: queue remote: send: ', data);
					this.trigger('mem->db');
				})
				.catch(function(err) {
					log.error('sync: queue remote: error: ', derr(err));
					fail_count++;
					if(fail_count < 3) enqueue.delay(100, this);
				});
		}.bind(this);
		enqueue();
	},

	run_outgoing_sync: function()
	{
		if(!turtl.sync_to_api) return false;
		return turtl.db.sync_outgoing.query().all().execute().bind(this)
			.then(function(items) {
				if(!items || !items.length) return;
				if(!this.connected) return;
				// note that this check is closest to the place it matters: the API.
				// we have no process in place to keep duplicate syncs from going
				// out, so we have ot be careful about double-posting
				if(this._outgoing_sync_running) return;
				this._outgoing_sync_running = true;
				return turtl.api.post('/v2/sync', items).bind(this)
					.then(function(synced) {
						if(synced.error)
						{
							log.error('sync: outgoing: api error: ', synced.error);
							barfr.barf('There was a problem syncing to the server (we\'ll try again soon): '+ synced.error);
						}
						var actions = synced.success.map(function(sync) {
							// these sync items will come through in our next
							// sync request unless we ignore them
							sync.sync_ids.map(this.ignore_on_next_sync.bind(this));
							// remove the successful sync records (it passes
							// back the IDs we handed it from our DB)
							return turtl.db.sync_outgoing.remove(sync.id);
						}.bind(this));
						// wait for the sync records to delete, then update our
						// local DB with the responses from the synced items
						return Promise.all(actions).bind(this)
							.then(function() {
								var actions = synced.success.map(function(sync) {
									// ignore the sync ids for actions that just
									// happened (we don't want to double-apply
									// changes since they will show up in the
									// next sync poll)
									(sync.sync_ids || []).each(function(sync_id) {
										this.ignore_on_next_sync(sync_id);
									}.bind(this));
									if(sync.action == 'delete') return null;
									return this.run_incoming_sync_item(sync);
								}.bind(this));
								return Promise.all(actions);
							});
					});
			})
			.catch(function(err) {
				log.error('sync: outgoing: problem syncing items: ', err);
				barfr.barf('There was a problem syncing to the server. Trying again soon.');
			})
			.finally(function() {
				this._outgoing_sync_running = false;
			});
	},

	start_remote_poll: function()
	{
		var sync_id = this.get('sync_id', false);
		// if we don't ahve a sync_id, load it from the DB
		(sync_id ? Promise.resolve({value: sync_id}) : turtl.db.sync.get('sync_id'))
			.bind(this)
			.then(function(rec) {
				this.set({sync_id: rec ? rec.value : null})
				this.poll_api_for_changes({immediate: true, skip_notify: true});
			})
			.catch(function(err) {
				log.error('sync: problem grabbing sync_id: ', derr(err));
			});
	},

	poll_api_for_changes: function(options)
	{
		options || (options = {});

		if(!this.enabled) return false;
		if(!turtl.user || !turtl.user.logged_in) return false;
		if(!turtl.poll_api_for_changes) return false;

		if(this._polling) return;

		this._polling = true;
		var failed = false;
		var sync_id = this.get('sync_id');
		var sync_url = '/v2/sync?sync_id='+sync_id+'&immediate='+(options.immediate ? 1 : 0);
		return turtl.api.get(sync_url, null, {timeout: 60000}).bind(this)
			.then(function(sync) {
				var orig = this.connected;
				this.connected = true;
				if(!orig && !options.skip_notify) turtl.events.trigger('api:connect');
				if(sync)
				{
					return this.update_local_db_from_api_sync(sync);
				}
			})
			.catch(function(err) {
				failed = true;
				var orig = this.connected;
				this.connected = false;
				if(orig && !options.skip_notify) turtl.events.trigger('api:disconnect');
				if(err instanceof Error) throw err;
			})
			.finally(function() {
				this._polling = false;
				if(failed)
				{
					setTimeout(this.poll_api_for_changes.bind(this, {immediate: true}), 15000);
				}
				else
				{
					this.poll_api_for_changes();
				}
			});
	},

	transform: function(sync, item)
	{
		var type = sync.type;

		if(type == 'user')
		{
			item.key = 'user';
		}

		if(type == 'note')
		{
			if(item.board_id)
			{
				item.boards = [item.board_id];
				delete item.board_id;
			}
			if(!Array.isArray(item.boards)) item.boards = [];
		}

		if(type == 'file')
		{
			item = item.file;
			item.id = item.hash;
			item.has_data = 0;
			delete item.hash;
		}

		return item;
	},

	type_to_table: function(typename)
	{
		return this.type_table_map[typename];
	},

	table_to_type: function(table)
	{
		return this.table_type_map[table];
	},

	run_incoming_sync_item: function(sync, options)
	{
		options || (options = {});

		if(this.should_ignore(sync.id))
		{
			return Promise.resolve();
		}
		var item = sync.data;
		delete sync.data;
		item = this.transform(sync, item);
		var table = this.type_to_table(sync.type);
		var db_table = turtl.db[table];
		if(!table || !db_table)
		{
			log.error('sync: api->db: error processing sync item (bad table): ', table, sync);
			throw new Error('sync: api->db: error processing sync item (bad sync.type): '+ sync.type);
		}

		/*
		if(sync.type == 'file')
		{
			var file = new FileData(item);
			turtl.files.download(file, file.download);
		}
		*/

		// save to the DB
		if(sync.action == 'delete')
		{
			var fn = 'remove';
			var rec = item.id;
		}
		else
		{
			var fn = 'update';
			var rec = item;
		}
		return (db_table[fn])(rec).bind(this)
			.then(function() {
				if(options.skip_local_tracker) return;
				// ok, we saved it to the DB, now notify our sync tracker for
				// this type of item that we just saved an item it might care
				// about
				var tracker = this.local_trackers[table];
				if(!tracker) return false;
				return tracker.run_incoming_sync_item(sync, item);
			})
			.catch(function(err) {
				log.error('sync: api->db: error saving to table: ', table, err);
				throw err;
			});
	},

	update_local_db_from_api_sync: function(sync_collection, options)
	{
		options || (options = {});

		var sync_id = sync_collection.sync_id;
		var records = sync_collection.records;
		return new Promise(function(resolve, reject) {
			var next = function()
			{
				var sync = records.splice(0, 1)[0];
				// resolve if we've iterated over all the items
				if(!sync) return resolve(sync_id);

				// run the sync item then call next() again
				return this.run_incoming_sync_item(sync, options).then(next);
			}.bind(this);
			next();
		}.bind(this))
		.tap(function() {
			this.set({sync_id: sync_id});
			return this.save();
		}.bind(this))
		.catch(function(err) {
			log.error('sync: api->db: error updating DB from sync: ', err);
			throw err;
		});
	},

	// -------------------------------------------------------------------------
	// file syncing section
	// -------------------------------------------------------------------------

	sync_files: function()
	{
		if(!this.enabled) return;
		Promise.all([
			this.upload_pending_files(),
			this.create_dummy_file_records()
				.then(this.download_pending_files.bind(this))
		]).bind(this)
			.catch(function(err) {
				log.error('sync: files: ', err);
			})
			.finally(function() {
				this.sync_files.delay(1000, this);
			});
	},

	create_dummy_file_records: function()
	{
		return turtl.files.create_dummy_file_records();
	},

	upload_pending_files: function()
	{
		return Promise.resolve();
	},

	download_pending_files: function()
	{
		return turtl.files.queue_download_blank_files();
	}
});

var SyncCollection = Composer.Collection.extend({
	run_incoming_sync_item: function(sync, item)
	{
		log.warn('SyncCollection.run_incoming_sync_item(): override me!');
	}
});

