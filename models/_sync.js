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

	shutdown: function() {
		return turtl.core.send('sync:shutdown');
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
		turtl.events.bind('sync:update', function(sync_item) {
			switch(sync_item.action) {
				case 'edit':
					this.reset(sync_item.data);
					break;
				case 'delete':
					this.destroy();
					break;
			}
		}.bind(this));
	}
});

// define a collection that listens for incoming sync changes and updates its
// models where needed
var SyncCollection = Composer.Collection.extend({
	// override me
	sync_type: null,

	init: function() {
		if(this.sync_type) {
			turtl.events.bind('sync:update:'+this.sync_type, function(sync_item) {
				var existing = this.get(sync_item.item_id);
				switch(sync_item.action) {
					case 'add':
						this.upsert(sync_item.data);
						break;
				}
			}.bind(this));
		}
	}
});

