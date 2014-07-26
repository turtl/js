var BoardListController = Composer.Controller.extend({
	element: 'ul',

	elements: {
	},

	events: {
		'click .dropdown ul li a.board': 'change_board',
		'click .dropdown ul li ul li a[href=#share]': 'open_share',
		'click .dropdown ul li ul li a[href=#edit]': 'open_edit',
		'click .dropdown ul li ul li a[href=#leave]': 'leave_board'
	},

	profile: null,
	board: null,
	filtered_boards: null,

	show_actions: true,

	init: function()
	{
		this.collection	=	this.profile.get('boards');

		if(!this.board) this.board = this.profile.get_current_board();
		this.render();

		this.profile.bind_relational('boards', ['add', 'remove', 'reset', 'change:id', 'change:title'], this.render.bind(this), 'boards:change');
		this.profile.bind('change:current_board', this.render.bind(this), 'boards:track_current');
	},

	release: function()
	{
		this.unbind('close-boards');
		this.unbind('change-board');
		this.profile.unbind_relational('boards', ['add', 'remove', 'reset', 'change:title'], 'boards:change');
		this.profile.unbind('change:current_board', 'boards:track_current');
		return this.parent.apply(this, arguments);
	},

	render: function()
	{
		// this is much faster than doing toJSON (since the board has notes and
		// shit we would have to iterate over)
		this.filtered_boards	=	this.collection.map(function(board) {
			return {
				id: board.id(),
				title: board.get('title'),
				privs: board.get('privs'),
				shared: board.get('shared')
			};
		});
		if(this.filter_text)
		{
			this.filtered_boards	=	this.filtered_boards.filter(function(board) {
				return board.title.toLowerCase().contains(this.filter_text.toLowerCase());
			}.bind(this));
		}
		var current	=	this.board;
		var content	=	Template.render('boards/list', {
			boards: this.filtered_boards,
			current: current ? toJSON(current) : null,
			show_actions: this.show_actions
		});
		this.html(content);
	},

	filter: function(text)
	{
		if(text == '') text = null;
		this.filter_text	=	text;
		this.render();
	},

	select_first_board: function()
	{
		if(this.filtered_boards.length == 0) return false;
		var first_id	=	this.filtered_boards[0].id;
		var board		=	this.collection.find_by_id(first_id);
		if(!board) return false;
		this.close_boards();
		this.do_change_board(board);
	},

	close_boards: function()
	{
		this.trigger('close-boards');
	},

	do_change_board: function(board)
	{
		this.trigger('change-board', board);
		this.board		=	board;
	},

	change_board: function(e)
	{
		if(!e) return;
		e.stop();
		this.close_boards();
		var atag		=	next_tag_up('a', e.target);
		var board_id	=	atag.href.replace(/^.*board-([0-9a-f]+).*?$/, '$1');
		var board		=	this.collection.find_by_id(board_id);
		this.do_change_board(board);
	},

	open_share: function(e)
	{
		if(!e) return;
		e.stop();
		var bid		=	next_tag_up('ul', e.target).className;
		var board	=	this.collection.find_by_id(bid);
		if(!board) return;
		this.close_boards();
		new BoardShareController({ board: board });
		if(turtl.user.get('personas').models().length == 0)
		{
			this.open_personas();
		}
	},

	open_personas: function(e)
	{
		if(e) e.stop();
		if(window._in_ext && window.port)
		{
			window.port.send('personas-add-open');
		}
		else
		{
			new PersonaEditController({
				collection: turtl.user.get('personas')
			});
		}
	},

	open_edit: function(e)
	{
		if(!e) return;
		e.stop();
		var bid		=	next_tag_up('ul', e.target).className;
		var board	=	this.collection.find_by_id(bid, {allow_cid: true});
		if(!board) return;
		this.close_boards();
		new BoardEditController({
			profile: turtl.profile,
			board: board,
			show_settings: true
		});
	},

	leave_board: function(e)
	{
		if(!e) return;
		e.stop();
		var bid			=	next_tag_up('ul', e.target).className;
		var board		=	this.collection.select_one({id: bid, shared: true});
		if(!board) return false;
		var persona		=	board.get_shared_persona();
		if(!persona) return;
		if(!confirm('Really leave this board? You won\'t be able to access it again until the owner invites you again!')) return false;

		this.close_boards();
		turtl.loading(true);
		board.leave_board(persona, {
			success: function() {
				turtl.loading(false);
				barfr.barf('You have successfully UNshared yourself from the board.');
			}.bind(this),
			error: function(err) {
				turtl.loading(false);
				barfr.barf('There was a problem leaving the board: '+ err);
			}
		});
	}
});
