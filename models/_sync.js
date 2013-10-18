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
	last_sync_local: 0,
	last_sync_remote: 0,

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

		Object.each(this.local_trackers, function(tracker) {
			tracker.sync_from_db();
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

