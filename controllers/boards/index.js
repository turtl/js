var BoardsController = Composer.Controller.extend({
	elements: {
		'.board-list': 'board_list',
		'.dropdown': 'dropdown',
		'.dropdown .header': 'header',
		'.dropdown .add-board': 'add_container',
		'.dropdown .boards-sub': 'boards_sub',
		'input[name=filter]': 'inp_filter'
	},

	events: {
		'click a.main': 'open_boards',
		'click .button.add': 'add_board',
		'keydown input[name=filter]': 'filter_boards_pre',
		'keyup input[name=filter]': 'filter_boards',
		'click .dropdown a[href=#add-persona]': 'open_personas',
	},

	profile: null,
	board: null,
	collection: null,
	filter_text: null,

	list_controller: null,
	add_controller: null,

	show_actions: true,
	switch_on_change: true,

	init: function()
	{
		if(!this.board) this.board = this.profile.get_current_board();
		this.render();
		turtl.profile.bind('change:current_board', function() {
			if(!this.switch_on_change) return;
			this.board	=	this.profile.get_current_board();
			this.render();
		}.bind(this), 'boards:change:render');
		this.bind('change-board', function(board) {
			if(board && this.switch_on_change)
			{
				this.profile.set_current_board(board);
			}
			this.render();
		}.bind(this), 'boards:change:render');
		turtl.keyboard.bind('b', this.open_boards.bind(this), 'boards:shortcut:open_boards');
	},

	release: function()
	{
		this.unbind('change-board');
		turtl.profile.unbind('change:current_board', 'boards:change:render');
		if(this.add_controller) this.add_controller.release();
		turtl.keyboard.unbind('b', 'boards:shortcut:open_boards');
		this.parent.apply(this, arguments);
	},

	render: function()
	{
		var current	=	this.board;
		var is_open	=	this.dropdown && this.dropdown.hasClass('open');
		var content	=	Template.render('boards/index', {
			num_boards: this.profile.get('boards').models().length,
			current: current ? toJSON(current) : null,
			num_personas: turtl.user.get('personas').models().length,
			is_open: is_open
		});
		this.html(content);

		// set up our listing sub-controller
		if(this.list_controller) this.list_controller.release();
		this.list_controller	=	new BoardListController({
			inject: this.boards_sub,
			profile: this.profile,
			board: this.board,
			show_actions: this.show_actions
		});
		this.list_controller.bind('close-boards', this.close_boards.bind(this));
		this.list_controller.bind('change-board', function(board) {
			if(board)
			{
				if(this.track_last_board)
				{
					turtl.user.get('settings').get_by_key('last_board').value(board.id());
				}
				this.board	=	board;
			}
			this.trigger('change-board', board);
		}.bind(this));

		if(this.dropdown) this.dropdown.monitorOutsideClick(function() {
			this.close_boards();
		}.bind(this));

		if(this.add_container)
		{
			this.add_container.set('slide', {duration: 'short'});
			this.add_container.get('slide').hide();
		}
	},

	open_boards: function(e)
	{
		if(e) e.stop();
		if(this.dropdown.hasClass('open'))
		{
			this.close_boards();
		}
		else
		{
			turtl.keyboard.detach();
			this.dropdown.addClass('open');
			this.board_list.addClass('open');
			var focus	=	function () { this.inp_filter.focus(); }.bind(this);
			focus();
			focus.delay(10, this);
			this.dropdown.setStyle('height', '');
			(function() { 
				var dcoord	=	this.dropdown.getCoordinates();
				var wcoord	=	window.getCoordinates();
				var wscroll	=	window.getScroll().y;
				var height	=	dcoord.height - ((dcoord.bottom - (wcoord.bottom + wscroll)) + 50);
				if(dcoord.bottom > wcoord.bottom)
				{
					this.dropdown.setStyles({ height: height });
				}
			}).delay(0, this);
		}
	},

	close_boards: function(e)
	{
		turtl.keyboard.attach();
		if(this.add_controller) this.add_controller.release();
		this.dropdown.removeClass('open');
		this.dropdown.setStyle('height', '');
		this.board_list.removeClass('open');
	},

	add_board: function(e)
	{
		if(modal.is_open) return false;
		if(e) e.stop();

		var parent	=	this.el.getParent();
		if(this.add_controller)
		{
			this.add_controller.inp_title.focus();
			return false;
		}

		this.add_controller	=	new BoardEditController({
			inject: this.add_container,
			profile: this.profile,
			bare: true
		});

		if(this.change_on_add)
		{
			this.add_controller.bind('new-board', function(board) {
				this.board	=	board;
				this.trigger('change-board', board);
			}.bind(this));
		}

		/*
		if(this.add_bare)
		{
			this.el.setStyle('display', 'none');
			this.add_controller.el.dispose().inject(this.el, 'after');
			this.add_controller.bind('release', function() {
				edit.unbind('boards:index:edit:release');
				this.inject	=	parent;
				this.el.setStyle('display', '');
				this.render();
			}.bind(this), 'boards:index:edit:release');
		}
		*/

		(function() {
			this.add_container.slide('in');
		}).delay(10, this);

		this.add_controller.bind('release', function() {
			this.add_controller.unbind('release', 'board:edit:release');
			this.add_controller	=	null;
			this.add_container.slide('out');
		}.bind(this), 'board:edit:release');
	},

	/**
	 * exists to fix some really annoying firefox glitches having to do with
	 * an input field not being cleared completely when pressing esc
	 */
	filter_boards_pre: function(e)
	{
		if(e && e.key == 'esc') e.stop();
	},

	filter_boards: function(e)
	{
		if(!this.list_controller) return false;

		if(e.key == 'esc')
		{
			if(this.inp_filter.value == '') this.close_boards();
			this.list_controller.filter(null);
			this.inp_filter.value	=	'';
			return false;
		}

		if(e.key == 'enter' && this.inp_filter.value != '')
		{
			this.list_controller.select_first_board();
			this.list_controller.filter(null);
			this.inp_filter.value	=	'';
			return;
		}

		this.list_controller.filter(this.inp_filter.value);
	},

	open_personas: function(e)
	{
		if(e) e.stop();
		this.close_boards();
		new PersonaEditController();
	}
});

