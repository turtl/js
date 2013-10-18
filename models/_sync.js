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
	time_track: {
		local: 0
	},

	// holds collections/models that monitor their respective local db table for
	// remote changes and sync those changes to in-memory models. note that
	// local trackers also listen for changes that are made locally because this
	// allows syncing between different pieces of an addon (say, a background
	// process and an app tab). this circumvents the need to do forced API syncs
	// and cross-process eventing.
	local_trackers: {},

	// holds collections/models that monitor their respective local db table for
	// local changes and sync those changes to the API
	remote_trackers: {},

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
		this.local_trackers[type]	=	collection_or_model;
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
		this.remote_trackers[type]	=	collection_or_model;
	},

	/**
	 * Start syncing locally. This means calling registered local trackers that
	 * will look for changes in the local DB and update their models
	 * accordingly.
	 */
	sync_from_db: function()
	{
		if(!turtl.do_sync) return false;

		// store last local sync time, update local sync time
		var last_local_sync	=	this.time_track.local;
		this.time_track.local	=	new Date().getTime();

		Object.each(this.local_trackers, function(tracker) {
			tracker.sync_from_db(last_local_sync);
		}.bind(this));

		turtl.db.sync.update({key: 'sync_time_local', time: new Date().getTime()}).fail(function(e) {
			barfr.barf('Error updating sync time in local db: '+ e.target.error.name);
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

		this.register_remote_tracker('personas', personas);
		this.register_remote_tracker('boards', boards);
		this.register_remote_tracker('notes', notes);
		this.register_remote_tracker('user', user);
	},

	/**
	 * Start remote syncing. This looks for data that has change in the local DB
	 * and syncs the changes out to the API. Also, it 
	 */
	sync_to_api: function()
	{
		if(!turtl.do_sync) return false;

		Object.each(this.local_trackers, function(tracker) {
			tracker.sync_to_api();
		}.bind(this));

		this.sync_to_api.delay(1000, this);
	},

	/**
	 * Calls the API's sync command, which downloads a list of things that have
	 * changed since the last sync. This list is then processed by the remote
	 * trackers (via their `sync_from_api` call) to update data in the local DB.
	 */
	sync_from_api: function()
	{
		// POST /sync here, call sync_from_api on all respective remote trackers
		// and update turtl.db.sync({sync_time: date.gettime()})

		this.sync_from_api.delay(10000, this);
	}
});

var SyncCollection	=	Composer.Collection.extend({
	local_table: 'overrideme',

	sync_from_db: function(last_mod)
	{
		// find all records in our owned table that were modified after the last
		// time we synced db -> mem and sync them to our in-memory models
		turtl.db[this.local_table].query('last_mod')
			.lowerBound(last_mod)
			.execute()
			.done(function(results) {
				results.each(function(result) {
					var model	=	this.find_by_id(result.id);
					if(!model) return false;

					// if we have a model, update it with the new data
					model.set(result);
				}.bind(this));
			}.bind(this))
			.error(function(e) {
				barfr.barf('Problem syncing '+ this.local_table +' records locally:' + e);
				console.log('sync_from_db: error: ', e);
			});
	},

	sync_to_api: function()
	{
		// grab objects that have been modified locally, atomically set their
		// modified flag to false, and sync them out to the API.
		var table	=	turtl.db[this.local_table];
		table.query('local_change')
			.only(true)
			.modify({local_change: false})
			.execute()
			.done(function(results) {
				results.each(function(result) {
					// create a new instance of our collection's model
					var model	=	new this.model();

					// raw_data disables encryption/decryption (only the in-mem
					// models are going to need this, so we just stupidly pass
					// around encrypted payloads when syncing to/from the API).
					model.raw_data	=	true;

					// set our model to use the API sync function (instead of
					// Composer.sync)
					model.sync	=	api_sync;
					model.set(result);
					var options	=	{
						success: function(model, res) {
							
						},
						error: function(err) {
							barfr.barf('Error syncing model to API: '+ err);
							// set the record as local_modified again so we can
							// try again next run
							table.get(result.id)
								.done(function(obj) {
									obj.local_change	=	true;
									table.update(obj);
								})
								.error(function(e) {
									console.log('Error marking object '+ this.local_table +'.'result.id +' as local_change = true: ', e);
								});
						}.bind(this)
					};
					if(model.sync_to_api && model.sync_to_api instanceof Function)
					{
						model.sync_to_api(options)
					}
					else
					{
						model.save(options);
					}
				}.bind(this));
			}.bind(this))
			.error(function(e) {
				barfr.barf('Problem syncing '+ this.local_table +' records remotely:' + e);
				console.log('sync_to_api: error: ', e);
			});
	},

	sync_from_api: function()
	{
	}
});
