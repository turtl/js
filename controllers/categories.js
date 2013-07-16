var CategoriesController = Composer.Controller.extend({
	elements: {
	},

	events: {
	},

	board: null,

	init: function()
	{
		if(!this.board) return false;
		this.render();
	},

	render: function()
	{
		var content = Template.render('categories/list', {
			categories: toJSON(this.board.get('categories'))
		});
		this.html(content);
	}
});
