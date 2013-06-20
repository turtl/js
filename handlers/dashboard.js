var dashboard = {
	load: function(project)
	{
		project = null;
		console.log('load dash?');
		if(!tagit.profile.loaded)
		{
			tagit.controllers.pages.trigger('loaded');
			return;
		}
		console.log('paid the troll toll');
		tagit.controllers.pages.load(DashboardController, {
			current_project: project
		});
	}
};
