Composer.suppress_warnings = true;

if(window.chrome && window.chrome.extension)
{
	window._base_url			=	chrome.extension.getURL('/data/app');
	window.__api_url			=	config.api_url;
	window._disable_cookie		=	true;
	window._in_ext				=	true;
	window._disable_api_tracker	=	true;

	if(window._in_background)
	{
		// this is a background page of the chrome app.
		turtl.sync	=	true;
		window.port	=	new ChromeAddonPort();
	}
	else
	{
		// this is the index.html page (the main app). run some extra setup.
		// NOTE: this particular setup relies on the fact that setup.js loads
		// *after* turtl.js
		window._in_app		=	true;

		// grab the background page, we'll be using it to bootstrap
		var bg				=	chrome.extension.getBackgroundPage();

		// we're going to use a comm object for our port that was given to us by
		// the gracious background app.
		window.port			=	new ChromeAddonPort({comm: bg.ext.last_opened_tab.comm});

		// log the user in on load
		var user			=	bg.turtl.user;
		window._auth		=	{
			uid: user.id(),
			auth: user.get_auth(),
			key: tcrypt.key_to_string(user.get_key())
		};

		var setup_profile			=	turtl.setup_profile;
		var setup_called			=	false;
		turtl.setup_profile	=	function()
		{
			setup_called	=	arguments;
		};
		// grab the background page's profile data (async)
		bg.turtl.profile.persist({
			now: true,
			complete: function(data) {
				window._profile	=	data;

				// replace the hijacked function
				turtl.setup_profile	=	setup_profile;

				// if setup_profile was called before the profile finished
				// serializing, call it again after replacing it with its 
				// original (and with its original args, stored in
				// `setup_called`)
				if(setup_called) turtl.setup_profile.apply(turtl, setup_called);
			}.bind(window)
		});
	}
}
