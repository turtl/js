var SyncError	=	extend_error(Error, 'SyncError');

var Sync = Composer.Model.extend({

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

	register_local_tracker: function(collection_or_model, type)
	{
		if(!collection_or_model.sync_from_db || typeof collection_or_model.sync_from_db != 'function')
		{
			throw new SyncError('Local tracker of type '+ type +' does not have `sync_from_db` function.');
		}
		this.local_trackers[type]	=	collection_or_model;
	},

	register_remote_tracker: function(collection_or_model, type)
	{
		if(!collection_or_model.sync_to_api || typeof collection_or_model.sync_to_api != 'function')
		{
			throw new SyncError('Remote tracker of type '+ type +' does not have `sync_to_api` function.');
		}
		if(!collection_or_model.sync_from_api || typeof collection_or_model.sync_from_api != 'function')
		{
			throw new SyncError('Remote tracker of type '+ type +' does not have `sync_from_api` function.');
		}
		this.remote_trackers[type]	=	collection_or_model;
	},

	sync_local: function()
	{
		if(!turtl.do_sync) return false;

		Object.each(this.local_trackers, function(tracker) {
			tracker.sync_from_db();
		}.bind(this));

		this.sync_local.delay(1000, this);
	},

	sync_remote: function()
	{
		if(!turtl.do_sync) return false;

		Object.each(this.local_trackers, function(tracker) {
			tracker.sync_to_api();
		}.bind(this));

		// POST /sync here, call sync_from_api on all respective remote trackers

		this.sync_local.delay(1000, this);
	}
});

