var BoardsViewController = Composer.Controller.extend({
	inject: turtl.main_container_selector,

	elements: {
		'.boards': 'boards',
		'.categories': 'categories',
		'.tags': 'tags',
		'.notes': 'notes',
		'.menu': 'menu'
	},

	// profile
	profile: null,

	current_board: null,

	boards_controller: null,
	categories_controller: null,
	tags_controller: null,

	init: function()
	{
		this.render();

		this.profile = turtl.profile;

		var do_load = function() {
			var current = this.profile.get_current_board();

			this.notes_controller = new NotesController({
				inject: this.notes,
				board: current
			});

			turtl.controllers.pages.trigger('loaded');
		}.bind(this);

		turtl.loading(true);
		var has_load = false;
		this.profile.bind('change:current_board', function() {
			this.soft_release();
			var current = this.profile.get_current_board();
			if(current && !has_load)
			{
				has_load = true;
				current.bind('notes_updated', function() {
					turtl.loading(false);
					current.unbind('notes_updated', 'board:loading:notes_updated');
				}, 'board:loading:notes_updated');
			}
			do_load();
		}.bind(this), 'dashboard:change_board');

		this.profile.bind_relational('boards', 'remove', function() {
			if(this.profile.get('boards').models().length > 0) return;
			this.profile.trigger('change:current_board');
		}.bind(this), 'dashboard:boards:remove');

		turtl.keyboard.bind('S-/', this.open_help.bind(this), 'dashboard:shortcut:open_help');

		this.profile.trigger('change:current_board');
	},

	soft_release: function()
	{
		if(this.categories_controller) this.categories_controller.release();
		if(this.tags_controller) this.tags_controller.release();
		if(this.notes_controller) this.notes_controller.release();
	},

	release: function()
	{
		this.soft_release();
		if(this.boards_controller) this.boards_controller.release();
		this.profile.unbind('change:current_board', 'dashboard:change_board');
		this.profile.unbind_relational('boards', 'remove', 'dashboard:boards:remove');
		turtl.keyboard.unbind('S-/', 'dashboard:shortcut:open_help');
		turtl.user.unbind('logout', 'dashboard:logout:clear_timer');

		this.parent.apply(this, arguments);
	},

	render: function()
	{
		var content = Template.render('dashboard/index');
		this.html(content);
	},

	open_help: function()
	{
		new HelpController();
	}
});

