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

	init: function()
	{
		this.render();
		this.profile.bind_relational('boards', ['add', 'remove', 'reset', 'change:title'], this.render.bind(this), 'boards:change');
		this.profile.bind('change:current_board', this.render.bind(this), 'boards:track_current');
		tagit.keyboard.bind('x', this.clear_filters.bind(this), 'boards:shortcut:clear_filters');
		tagit.keyboard.bind('b', this.add_board.bind(this), 'boards:shortcut:add_board');
	},

	release: function()
	{
		this.profile.unbind_relational('boards', ['add', 'remove', 'reset', 'change:title'], 'boards:change');
		this.profile.unbind('change:current_board', 'boards:track_current');
		tagit.keyboard.unbind('x', 'boards:shortcut:clear_filters');
		tagit.keyboard.unbind('b', 'boards:shortcut:add_board');
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
		if(e) e.stop();
		new BoardEditController({
			profile: this.profile
		});
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
		var board_id = this.selector.value;
		var board = this.profile.get('boards').find_by_id(board_id);
		if(board) this.profile.set_current_board(board);
	},

	clear_filters: function()
	{
		var current = this.profile.get_current_board();
		current.get('tags').each(function(t) {
			t.set({
				selected: false,
				excluded: false
			}, {silent: true});
		});
		current.set({filters: []});
		current.get('tags').trigger('reset');
		current.get('tags').trigger('change:selected');
	}
});

