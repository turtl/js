var Profile = Composer.RelationalModel.extend({
	relations: {
		spaces: {
			collection: 'Spaces'
		},
		boards: {
			collection: 'Boards'
		},
		invites: {
			collection: 'Invites'
		}
	},

	loaded: false,
	current_space_id: null,

	init: function() {
		// lets certain interested parties know that the current space has
		// changed
		this.get('spaces').bind('change', function(space) {
			if(space.id() != this.current_space().id()) return;
			this.trigger('change:cur-space');
		}.bind(this));
		this.bind('destroy', function() {
			this.loaded = false;
		}.bind(this));
	},

	load: function(options) {
		options || (options = {});

		return turtl.core.send('profile:load')
			.bind(this)
			.then(function(profiledata) {
				delete profiledata.user;
				this.loaded = true;
				this.set(profiledata);
				this.trigger('loaded');
			});
	},

	calculate_size: function(options) {
		return turtl.core.send('profile:get-size');
	},

	export: function() {
		return turtl.core.send('profile:export');
	},

	import: function(action, exportdata) {
		return turtl.core.send('profile:import', action, exportdata);
	},

	current_space: function() {
		var spaces = this.get('spaces');
		var space_id = this.current_space_id;
		var space = spaces.get(space_id);
		if(!space) space = spaces.first();
		return space;
	},

	set_current_space: function(space_id) {
		var current_space = this.current_space();
		var current_space_id = current_space && current_space.id();
		if(current_space_id == space_id) return;
		// we can set to null to clear the current selection
		if(space_id !== null) {
			var spaces = this.get('spaces');
			var space = spaces.get(space_id);
			if(!space) return;
		}
		this.current_space_id = space_id;
		turtl.events.trigger('profile:set-current-space');
	},

	space_boards: function() {
		var space_id = this.current_space().id();
		return turtl.profile.get('boards').filter(function(b) {
			return b.get('space_id') == space_id;
		});
	},
});

