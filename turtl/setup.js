Composer.suppress_warnings = true;

setTimeout(function() {
	if(new String(config.client) == 'desktop')
	{
		var gui = require('nw.gui');
		config.version = gui.App.manifest.version;
	}
});

