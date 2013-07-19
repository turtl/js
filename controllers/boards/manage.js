var BoardManageController = Composer.Controller.extend({
	elements: {
		'ul.mine': 'my_boards'
	},

	events: {
		'click .button.add': 'open_add',
		'click a[href=#share]': 'open_share',
		'click a[href=#edit]': 'open_edit',
		'click a[href=#delete]': 'delete_board',
		'click a[href=#leave]': 'leave_board'
	},

	collection: null,

	init: function()
	{
		this.render();
		modal.open(this.el);
		var close_fn = function() {
			this.release();
			modal.removeEvent('close', close_fn);
		}.bind(this);
		modal.addEvent('close', close_fn);

		this.collection.bind(['add', 'remove', 'change', 'reset'], this.render.bind(this), 'boards:manage:render');

		tagit.keyboard.detach(); // disable keyboard shortcuts while editing
	},

	release: function()
	{
		if(modal.is_open) modal.close();
		if(this.my_sort) this.my_sort.detach();
		this.collection.unbind(['add', 'remove', 'change', 'reset'], 'boards:manage:render');
		tagit.keyboard.attach(); // re-enable shortcuts
		this.parent.apply(this, arguments);
	},

	render: function()
	{
		// load board data (sans notes)
		var boards	=	this.collection.map(function(p) {
			var _notes	=	p.get('notes');
			p.unset('notes', {silent: true});
			var ret		=	toJSON(p);
			p.set({notes: _notes}, {silent: true});
			return ret;
		});
		var content = Template.render('boards/manage', {
			boards: boards
		});
		this.html(content);

		this.setup_sort();
	},

	setup_sort: function()
	{
		if(this.my_sort) this.my_sort.detach();
		this.my_sort	=	new Sortables(this.my_boards, {
			handle: 'span.sort',
			onComplete: function() {
				var items	=	this.my_boards.getElements('> li');
				var sort	=	{};
				var ids		=	items.each(function(li, idx) {
					var bid		=	li.className.replace(/^.*board_([0-9a-f-]+).*?$/, '$1');
					sort[bid]	=	idx;
				});
				tagit.user.get('settings').get_by_key('board_sort').value(sort);
				this.collection.sort();
			}.bind(this)
		});
	},

	open_add: function(e)
	{
		if(e) e.stop();
		this.release();
		new BoardEditController({
			return_to_manage: true,
			profile: tagit.profile
		});
	},

	open_share: function(e)
	{
		if(!e) return;
		e.stop();
		var bid		=	next_tag_up('a', e.target).className;
		var board	=	this.collection.find_by_id(bid);
		if(!board) return;
		this.release();
		new BoardShareController({
			board: board
		});
	},

	open_edit: function(e)
	{
		if(!e) return;
		e.stop();
		var bid		=	next_tag_up('a', e.target).className;
		var board	=	this.collection.find_by_id(bid);
		if(!board) return;
		this.release();
		new BoardEditController({
			return_to_manage: true,
			profile: tagit.profile,
			board: board
		});
	},

	delete_board: function(e)
	{
		if(!e) return;
		e.stop();
		var bid		=	next_tag_up('a', e.target).className;
		var board	=	this.collection.find_by_id(bid);
		if(!board) return;
		if(!confirm('Really delete this board, and all of its notes PERMANENTLY?? This cannot be undone!!')) return false;

		tagit.loading(true);
		board.destroy({
			success: function() {
				tagit.loading(false);

				var next = this.collection.first() || false;
				tagit.profile.set_current_board(next);
			}.bind(this),
			error: function() {
				tagit.loading(false);
			}
		});
	},

	leave_board: function(e)
	{
		if(!e) return;
		e.stop();
		var bid			=	next_tag_up('a', e.target).className;
		var board		=	this.collection.select_one({id: bid, shared: true});
		if(!board) return false;
		var persona		=	board.get_shared_persona();
		if(!persona) return;
		if(!confirm('Really leave this board? You won\'t be able to access it again until the owner invites you again!')) return false;

		tagit.loading(true);
		board.leave_board(persona, {
			success: function() {
				tagit.loading(false);
				barfr.barf('You have successfully UNshared yourself from the board.');
			}.bind(this),
			error: function(err) {
				tagit.loading(false);
				barfr.barf('There was a problem leaving the board: '+ err);
			}
		});
	}
});
