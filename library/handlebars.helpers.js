Handlebars.registerHelper('url', function(url) {
	if(window._base_url)
	{
		return window._base_url.replace(/\/$/, '') + url;
	}
	else
	{
		return url;
	}
});

