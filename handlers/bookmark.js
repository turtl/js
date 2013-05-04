var bookmark = {
	index: function()
	{
		var qs = parse_querystring();
		if(!tagit.user.logged_in)
		{
			var redirect = [];
			Object.each(qs, function(v, k) {
				redirect.push(k + '=' + escape(v));
			});
			redirect = '/bookmark?'+redirect.join('&');
			redirect = Base64.encode(redirect);
			tagit.route('/users/login?redirect='+redirect);
			return false;
		}

		var linkdata = {
			url: qs.url,
			title: qs.title,
			text: qs.text
		};
		tagit.controllers.pages.load(BookmarkController, {
			linkdata: linkdata
		});
	}
};
