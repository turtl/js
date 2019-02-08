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

	set_api_config: function(config) {
		return turtl.core.send('app:api:set-config', config);
	},

	get_api_config: function() {
		return turtl.core.send('app:api:get-config');
	},

	get_logs: function(lines) {
		return turtl.core.send('app:get-log', parseInt(lines) || 256);
	},

	shutdown: function() {
		return turtl.core.send('app:shutdown');
	},
});

