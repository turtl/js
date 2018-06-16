RememberMe.adapters.localstorage = Composer.Event.extend({
	key: 'remember-me:last-login',

	initialize: function(_options) {
	},

	get_login: function() {
		var last_login = localStorage[this.key];
		if(!last_login) return Promise.resolve();
		try {
			var login = JSON.parse(last_login);
		} catch(_) {
			return Promise.resolve();
		}
		return {user_id: login.user_id, key: login.key};
	},

	save: function(user_id, key) {
		localStorage[this.key] = JSON.stringify({user_id: user_id, key: key});
	},

	clear: function() {
		delete localStorage[this.key];
	},
});

