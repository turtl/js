var BoardsController = Composer.Controller.extend({
	elements: {
		'.board-list': 'board_list',
		'.dropdown': 'dropdown',
		'input[name=filter]': 'inp_filter'
	},

	events: {
		'click a.main': 'open_boards',
		'click .button.add': 'add_board',
		'keyup input[name=filter]': 'filter_boards',
		'click .dropdown a[href=#add-persona]': 'open_personas',
		'click .dropdown ul li a.board': 'change_board',
		'click .dropdown ul li ul li a[href=#share]': 'open_share',
		'click .dropdown ul li ul li a[href=#edit]': 'open_edit',
		'click .dropdown ul li ul li a[href=#delete]': 'delete_board',
		'click .dropdown ul li ul li a[href=#leave]': 'leave_board',
	},

	profile: null,
	collection: null,
	filter_text: null,

	init: function()
	{
		this.render();
		this.profile.bind_relational('boards', ['add', 'remove', 'reset', 'change:id', 'change:title'], this.render.bind(this), 'boards:change');
		this.profile.bind('change:current_board', this.render.bind(this), 'boards:track_current');
		this.collection	=	this.profile.get('boards');
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
		var current	=	this.profile.get_current_board();
		var boards	=	toJSON(this.profile.get('boards'));
		var is_open	=	this.dropdown && this.dropdown.hasClass('open');
		var filter	=	this.filter_text;
		if(this.filter_text)
		{
			boards	=	boards.filter(function(board) {
				return board.title.contains(this.filter_text);
			}.bind(this));
		}
		var content	=	Template.render('boards/list', {
			boards: boards,
			current: current ? toJSON(current) : null,
			num_personas: turtl.user.get('personas').models().length,
			is_open: is_open,
			filter_text: filter
		});
		this.html(content);

		if(this.dropdown) this.dropdown.monitorOutsideClick(function() {
			this.close_boards();
		}.bind(this));
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
		}
	},

	close_boards: function(e)
	{
		turtl.keyboard.attach();
		this.dropdown.removeClass('open');
		this.board_list.removeClass('open');
	},

	add_board: function(e)
	{
		if(modal.is_open) return false;
		if(e) e.stop();

		var parent	=	this.el.getParent();
		var edit	=	new BoardEditController({
			profile: this.profile
		});
	},

	change_board: function(e)
	{
		if(!e) return;
		e.stop();
		this.close_boards();
		this.trigger('change-board');
		var atag		=	next_tag_up('a', e.target);
		var board_id	=	atag.href.replace(/^.*board-([0-9a-f]+).*?$/, '$1');
		var board = this.profile.get('boards').find_by_id(board_id);
		if(board) this.profile.set_current_board(board);
	},

	filter_boards: function(e)
	{
		if(e.key == 'esc')
		{
			this.filter_text		=	null;
			this.inp_filter.value	=	'';
			this.profile.get('boards').trigger('reset');
			return false;
		}

		if(this.inp_filter.value == '')
		{
			this.filter_text		=	null;
			this.profile.get('boards').trigger('reset');
			return false;
		}

		this.filter_text	=	this.inp_filter.value;
		this.profile.get('boards').trigger('reset');
	},

	open_personas: function(e)
	{
		if(e) e.stop();
		this.close_boards();
		new PersonaEditController();
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
			board: board
		});
	},

	delete_board: function(e)
	{
		if(!e) return;
		e.stop();
		var bid		=	next_tag_up('ul', e.target).className;
		console.log('bid: ', bid);
		var board	=	this.collection.find_by_id(bid, {allow_cid: true});
		if(!board) return;
		if(!confirm('Really delete this board, and all of its notes PERMANENTLY?? This cannot be undone!!')) return false;

		this.close_boards();
		turtl.loading(true);
		board.destroy({
			success: function() {
				turtl.loading(false);

				var next = this.collection.first() || false;
				turtl.profile.set_current_board(next);
			}.bind(this),
			error: function() {
				turtl.loading(false);
			}
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

