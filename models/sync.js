var SyncError	=	extend_error(Error, 'SyncError');

var Sync = Composer.Model.extend({

	// holds collections/models that will monitor their respective local db
	// table for changes and update themselves/their models accordingly
	local_trackers: {},
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
			throw new SyncError('Local tracker of type '+ type +' does not have `sync_to_api` function.');
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

		// POST /sync here

		this.sync_local.delay(1000, this);
	}
});

