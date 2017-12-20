"use strict";
var Sync = Composer.Model.extend({
	start: function() {
		return turtl.core.send('sync:start');
	},

	pause: function() {
		return turtl.core.send('sync:pause');
	},

	resume: function() {
		return turtl.core.send('sync:resume');
	},

	status: function() {
		return turtl.core.send('sync:status');
	},

	shutdown: function(wait) {
		return turtl.core.send('sync:shutdown', wait);
	},

	get_pending: function() {
		return turtl.core.send('sync:get-pending');
	},

	unfreeze: function(sync_id) {
		return turtl.core.send('sync:unfreeze-item', sync_id);
	},

	delete: function(sync_id) {
		return turtl.core.send('sync:delete-item', sync_id);
	},
});

// define a model that listens for incoming sync changes and updates itself
var SyncModel = Composer.RelationalModel.extend({
	init: function() {
		var bindname = 'syncmodel:init:sync:update:'+this.cid();
		turtl.events.bind('sync:update', function(sync_item) {
			if(sync_item.item_id != this.id()) return;
			return this.incoming_sync(sync_item);
		}.bind(this), bindname);
		this.bind('destroy', function() {
			turtl.events.unbind('sync:update', bindname);
		}.bind(this));
	},

	incoming_sync: function(sync_item) {
		switch(sync_item.action) {
			case 'edit':
				this.reset(sync_item.data);
				break;
			case 'delete':
				this.destroy({skip_remote_sync: true});
				break;
		}
	},
});

// define a collection that listens for incoming sync changes and updates its
// models where needed
var SyncCollection = Composer.Collection.extend({
	// override me
	sync_type: null,

	init: function() {
		if(this.sync_type) {
			turtl.events.bind('sync:update:'+this.sync_type, this.incoming_sync.bind(this))
		}
	},

	incoming_sync: function(sync_item) {
		switch(sync_item.action) {
			case 'add':
				this.upsert(sync_item.data);
				break;
		}
	},
});

