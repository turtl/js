Composer.suppress_warnings = true;

setTimeout(function() {
	var gui = require('nw.gui');
	if(new String(config.client) == 'desktop')
	{
		config.version = gui.App.manifest.version;
	}
});

