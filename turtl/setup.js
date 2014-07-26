// force JSON.decode in MT to use JSON.parse (instead of eval)
JSON.secure = true;

if(window._in_desktop)
{
	if(window.gui)
	{
		config.version = gui.App.manifest.version;
	}
	else if(window._firefox)
	{
		config.version = 'buildme';
		window.port = new FirefoxDesktopPort();
		window._route_base = '/content';
		log.setLevel(log.levels.DEBUG);
		window.do_reload = function()
		{
			window.location = 'chrome://turtl/content/data/index.html';
		};
	}
	window._base_url = window.location.toString().replace(/^(.*)\/.*?$/, '$1/app');
	window._disable_cookie = true;
}

