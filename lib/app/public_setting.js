var PublicSetting = Composer.Class.extend({
	all: function() {
		return JSON.parse(localStorage.settings || '{}') || {};
	},

	save: function(settings) {
		localStorage.settings = JSON.stringify(settings);
	},

	set: function(key, val) {
		var settings = this.all();
		settings[key] = val;
		this.save(settings);
		return this.all();
	},

	get: function(key, def) {
		var settings = this.all();
		var val = settings[key];
		return val === undefined ? def : val;
	},

	clear: function() {
		delete localStorage.settings;
	}
});

