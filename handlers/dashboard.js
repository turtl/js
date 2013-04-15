var dashboard = {
	load: function(project)
	{
		tagit.controllers.pages.load(DashboardController, {
			current_project: project
		});
	}
};
