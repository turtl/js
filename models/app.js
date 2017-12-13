var App = Composer.Model.extend({
	connected: function() {
		return turtl.core.send('app:connected');
	},

	wipe_user_data: function() {
		return turtl.core.send('app:wipe-user-data');
	},

	wipe_app_data: function() {
		return turtl.core.send('app:wipe-app-data');
	},

	set_api_endpoint: function(endpoint) {
		return turtl.core.send('app:api:set-endpoint', endpoint);
	},

	get_api_endpoint: function() {
		return turtl.core.send('app:api:get-endpoint');
	},

	set_old_api_endpoint: function(endpoint) {
		return turtl.core.send('app:api:set-old-endpoint', endpoint);
	},

	get_old_api_endpoint: function() {
		return turtl.core.send('app:api:get-old-endpoint');
	},

	shutdown: function() {
		return turtl.core.send('app:shutdown');
	},
});

