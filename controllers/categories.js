var CategoriesController = Composer.Controller.extend({
	elements: {
	},

	events: {
	},

	project: null,

	init: function()
	{
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
