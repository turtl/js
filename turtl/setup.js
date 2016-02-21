Composer.suppress_warnings = true;

// we need CBC for backwards compat
sjcl.beware['CBC mode is dangerous because it doesn\'t protect message integrity.']();

setTimeout(function() {
	if(new String(config.client) == 'desktop')
	{
		var gui = require('nw.gui');
		config.version = gui.App.manifest.version;
	}
});

