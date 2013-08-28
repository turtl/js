Composer.suppress_warnings = true;
if(window.chrome && window.chrome.extension)
{
	window._in_ext				=	true;
	window._base_url			=	chrome.extension.getURL('/app');
	window.port					=	new ChromeAddonPort();
	window.__api_url			=	config.api_url;
	window._disable_api_tracker	=	true;
}
