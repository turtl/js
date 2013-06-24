var dashboard = {
	load: function(project)
	{
		project = null;
		if(!tagit.profile.profile_data)
		{
			tagit.controllers.pages.trigger('loaded');
			return;
		}
		tagit.controllers.pages.load(DashboardController, {
			current_project: project
		});
	}
};
