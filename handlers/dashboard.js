var dashboard = {
	load: function(project)
	{
		research.controllers.pages.load(DashboardController, {
			current_project: project
		});
	}
};
