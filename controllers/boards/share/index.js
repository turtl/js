var BoardsShareController = Composer.Controller.extend({
	class_name: 'board-share',

	board_id: null,

	model: null,

	init: function()
	{
		if(!this.board_id) throw new Error('boards: share: board_id not specified');
		if(!this.model)
		{
			this.model = turtl.profile.get('boards').get(this.board_id);
		}
		if(!this.model) throw new Error('boards: share: bad model');

		turtl.push_title('Sharing: '+ this.model.get('title'), '/boards');
		this.bind('release', turtl.pop_title.bind(null, false));

		this.render();

		// set up the action button
		this.track_subcontroller('actions', function() {
			var actions = new ActionController();
			actions.set_actions([{title: 'New member', name: 'share', icon: 'add_user'}]);
			this.with_bind(actions, 'actions:fire', this.open_add.bind(this));
			return actions;
		}.bind(this));
	},

	render: function()
	{
		var board = this.model.toJSON();
		this.html(view.render('boards/share/index', {
			board: board,
			members: board.personas
		}));
	},

	open_add: function()
	{
		new BoardsShareInviteController({model: this.model});
	}
});

