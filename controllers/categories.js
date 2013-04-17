var CategoriesController = Composer.Controller.extend({
	elements: {
	},

	events: {
	},

	profile: null,
	project: null,

	init: function()
	{
		this.project	=	this.profile.get_current_project();
		if(!this.project) return false;
		this.render();
	},

	render: function()
	{
		var content = Template.render('categories/list', {
			categories: toJSON(this.project.get('categories'))
		});
		this.html(content);
	}
});
