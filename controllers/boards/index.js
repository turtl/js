var BoardsController = Composer.Controller.extend({
	elements: {
		'.board-list select': 'selector'
	},

	events: {
		'click a.add': 'add_board',
		'click a.manage': 'manage_boards',
		'change .board-list select': 'change_board'
	},

	profile: null,
	add_bare: false,

	init: function()
	{
		this.render();
		this.profile.bind_relational('boards', ['add', 'remove', 'reset', 'change:title'], this.render.bind(this), 'boards:change');
		this.profile.bind('change:current_board', this.render.bind(this), 'boards:track_current');
		turtl.keyboard.bind('b', this.add_board.bind(this), 'boards:shortcut:add_board');
	},

	release: function()
	{
		this.unbind('change-board');
		this.profile.unbind_relational('boards', ['add', 'remove', 'reset', 'change:title'], 'boards:change');
		this.profile.unbind('change:current_board', 'boards:track_current');
		turtl.keyboard.unbind('b', 'boards:shortcut:add_board');
		this.parent.apply(this, arguments);
	},

	render: function()
	{
		var current = this.profile.get_current_board();
		if(current) current = current.get('id');
		var content = Template.render('boards/list', {
			boards: toJSON(this.profile.get('boards')),
			current: current
		});
		this.html(content);
	},

	add_board: function(e)
	{
		if(modal.is_open) return false;
		if(e) e.stop();

		var parent	=	this.el.getParent();
		var edit	=	new BoardEditController({
			inject: this.add_bare ? parent : null,
			profile: this.profile,
			bare: this.add_bare
		});
		if(this.add_bare)
		{
			this.el.setStyle('display', 'none');
			edit.el.dispose().inject(this.el, 'after');
			edit.bind('release', function() {
				edit.unbind('boards:index:edit:release');
				this.inject	=	parent;
				this.el.setStyle('display', '');
			}.bind(this), 'boards:index:edit:release');
		}
	},

	manage_boards: function(e)
	{
		if(e) e.stop();
		new BoardManageController({
			collection: this.profile.get('boards')
		});
	},

	change_board: function(e)
	{
		this.trigger('change-board');
		var board_id = this.selector.value;
		var board = this.profile.get('boards').find_by_id(board_id);
		if(board) this.profile.set_current_board(board);
	}
});

