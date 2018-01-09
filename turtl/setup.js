Composer.suppress_warnings = true;

setTimeout(function() {
	if(new String(config.client) == 'desktop') {
		var app = require('electron').remote.app;
		config.version = app.getVersion();
	}
});

