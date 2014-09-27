// force JSON.decode in MT to use JSON.parse (instead of eval)
JSON.secure = true;

Composer.suppress_warnings = true;

if(window._in_desktop)
{
	config.version = gui.App.manifest.version;
	window.__api_url = config.api_url;
	window._base_url = window.location.toString().replace(/^(.*)\/.*?$/, '$1/app');
	window._disable_cookie = true;
}

