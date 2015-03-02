"use strict";
var Sync = Composer.Model.extend({
	// local model ID tracking (for preventing double syncs)
	sync_ignore: {
		local: [],
		remote: []
	},

	// if false, syncing functions will no longer run
	enabled: false,

	// holds collections that are responsible for handling incoming data syncs
	// from the API
	local_trackers: {},

	// used to track local syncs
	local_sync_id: 0,

	init: function()
	{
	},

	/**
	 * Instruct the syncing system to start
	 */
	start: function()
	{
		this.enabled = true;
		this.bind('db->mem', this.sync_db_to_mem.bind(this), 'sync:model:db->mem');
		this.bind('mem->db', this.run_outgoing_sync.bind(this), 'sync:model:mem->db');
		this.bind('api->db', this.run_incoming_sync.bind(this), 'sync:model:api->db');
		this.start_remote_poll();
	},

	/**
	 * Instruct the syncing system to stop
	 */
	stop: function()
	{
		this.enabled = false;
		this.unbind('db->mem', 'sync:model:db->mem');
		this.unbind('mem->db', 'sync:model:mem->db');
		this.unbind('api->db', 'sync:model:api->db');
		this.stop_remote_poll();
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
		var ignores = this.sync_ignore[options.type];
		for(var i = 0; i < ids.length; i++)
		{
			var id = ids[i];
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
		if(!turtl.db || !turtl.db.sync) return false;

		var sync_id = this.get('sync_id');
		turtl.db.sync.update(
			{key: 'sync_id', value: sync_id}
		).catch(function(e) {
			log.error('Sync.save: problem persisting sync record: ', e);
		});
	},

	/**
	 * Notify the syncing system that data has changed locally and needs to be
	 * synced to the API.
	 */
	queue_outgoing_change: function(table, action, data)
	{
		var msg = {
			type: table,
			action: action,
			data: data
		};
		var fail_count = 0;
		var enqueue = function()
		{
			turtl.db.sync_outgoing.add(msg).bind(this)
				.then(function() {
					log.debug('sync: queue remote: send: ', msg);
					this.trigger('mem->db');
				})
				.catch(function(e) {
					log.error('sync: queue remote: error: ', e);
					fail_count++;
					if(fail_count < 3) enqueue.delay(100, this);
				});
		}.bind(this);
		enqueue();
	},

	sync_db_to_mem: function()
	{
	},

	run_outgoing_sync: function()
	{
	},

	run_incoming_sync: function()
	{
	},

	start_remote_poll: function()
	{
		var sync_id = this.get('sync_id', false);
		// if we don't ahve a sync_id, load it from the DB
		(sync_id ? Promise.resolve({value: sync_id}) : turtl.db.sync.get('sync_id'))
			.bind(this)
			.then(function(rec) {
				this.set({sync_id: rec ? rec.value : null})
				this._remote_poll = setInterval(this.poll_api_for_changes.bind(this), 10000);
			})
			.catch(function(e) {
				log.error('sync: problem grabbing sync_id: ', e.stack);
			});
	},

	stop_remote_poll: function()
	{
		clearInterval(this._remote_poll);
	},

	poll_api_for_changes: function()
	{
		if(!turtl.user || !turtl.user.logged_in) return false;
		if(!turtl.poll_api_for_changes) return false;
	}
});

var SyncCollection = Composer.Collection.extend({
});

