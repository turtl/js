var messages = {
	index: function()
	{
		if(!tagit.profile.profile_data)
		{
			tagit.controllers.pages.trigger('loaded');
			return;
		}
		tagit.controllers.pages.load(MessagesController);
	}
};
