var BoardsController = Composer.Controller.extend({
	inject: turtl.main_container_selector,

	events: {
		'click .button.add': 'open_add'
	},

	init: function()
	{
		this.render();
		this.with_bind(turtl.profile.get('boards'), ['add', 'remove', 'change'], this.render.bind(this));
	},

	render: function()
	{
		turtl.push_title('Boards');
		this.html(view.render('boards/index', {
			boards: toJSON(turtl.profile.get('boards'))
		}));
	},

	open_add: function(e)
	{
		if(e) e.stop();
		new BoardEditController();
	}
});

