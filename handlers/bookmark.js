var bookmark = {
	index: function()
	{
		var qs = parse_querystring();
		if(!turtl.user.logged_in)
		{
			var redirect = [];
			Object.each(qs, function(v, k) {
				redirect.push(k + '=' + escape(v));
			});
			redirect = '/bookmark?'+redirect.join('&');
			redirect = Base64.encode(redirect);
			turtl.route('/users/login?redirect='+redirect);
			return false;
		}

		if(!turtl.profile.profile_data)
		{
			return false;
		}

		turtl.controllers.pages.load(BookmarkController, {});
	}
};
