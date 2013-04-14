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
			categories: this.project.get('categories').toJSON()
		});
		this.html(content);
	}
});
