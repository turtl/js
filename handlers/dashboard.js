var dashboard = {
	load: function(project)
	{
		project = null;
		tagit.controllers.pages.load(DashboardController, {
			current_project: project
		});
	}
};
