// force JSON.decode in MT to use JSON.parse (instead of eval)
JSON.secure = true;

Composer.suppress_warnings = true;

if(window.chrome && window.chrome.extension)
{
	window._base_url = chrome.extension.getURL('/data/app');
	window.__api_url = config.api_url;
	window._disable_cookie = true;
	window._in_ext = true;
	config.version = chrome.app.getDetails().version;

	if(window._in_background)
	{
		// this is a background page of the chrome app.
		turtl.do_sync = true;
		window.port = new ChromeAddonPort();
	}
	else
	{
		// this is the index.html page (the main app). run some extra setup.
		// NOTE: this particular setup relies on the fact that setup.js loads
		// *after* turtl.js
		window._in_app = true;

		// grab the background page, we'll be using it to bootstrap
		var bg = chrome.extension.getBackgroundPage();

		// we're going to use a comm object for our port that was given to us by
		// the gracious background app.
		window.port = new ChromeAddonPort({comm: bg.ext.last_opened_tab.comm});

		// log the user in on load
		var user = bg.turtl.user;
		window._auth = {
			uid: user.id(),
			auth: user.get_auth(),
			key: tcrypt.key_to_string(user.get_key())
		};
	}
}

if(window._in_desktop)
{
	config.version = gui.App.manifest.version;
	window.__api_url = config.api_url;
	window._base_url = window.location.toString().replace(/^(.*)\/.*?$/, '$1/app');
	window._disable_cookie = true;
}

