var BoardManageController = Composer.Controller.extend({
	elements: {
		'ul.mine': 'my_boards'
	},

	events: {
		'click a[href=#add-persona]': 'open_personas',
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

		turtl.keyboard.detach(); // disable keyboard shortcuts while editing
	},

	release: function()
	{
		if(modal.is_open) modal.close();
		if(this.my_sort) this.my_sort.detach();
		this.collection.unbind(['add', 'remove', 'change', 'reset'], 'boards:manage:render');
		turtl.keyboard.attach(); // re-enable shortcuts
		this.parent.apply(this, arguments);
	},

	render: function()
	{
		// load board data (sans notes)
		var boards = this.collection.map(function(b) {
			var _notes = b.get('notes');
			b.unset('notes', {silent: true});
			var ret = toJSON(b);
			b.set({notes: _notes}, {silent: true});
			ret.share_enabled = b.share_enabled();;
			return ret;
		});
		var content = Template.render('boards/manage', {
			boards: boards,
			enable_sharing: turtl.user.get('personas').models().length > 0
		});
		this.html(content);

		//this.setup_sort();
	},

	/*
	setup_sort: function()
	{
		if(this.my_sort) this.my_sort.detach();
		this.my_sort = new Sortables(this.my_boards, {
			handle: 'span.sort',
			onComplete: function() {
				var items = this.my_boards.getElements('> li');
				var sort = {};
				var ids = items.each(function(li, idx) {
					var bid = li.className.replace(/^.*board_([0-9a-f-]+).*?$/, '$1');
					sort[bid] = idx;
				});
				turtl.user.get('settings').get_by_key('board_sort').value(sort);
				this.collection.sort();
			}.bind(this)
		});
	},
	*/

	open_personas: function(e)
	{
		if(e) e.stop();
		if(window._in_ext && window.port)
		{
			window.port.send('personas-add-open');
		}
		else
		{
			this.release();
			new PersonaEditController({
				collection: turtl.user.get('personas')
			});
		}
	},

	open_add: function(e)
	{
		if(e) e.stop();
		this.release();
		new BoardEditController({
			profile: turtl.profile
		});
	},

	open_share: function(e)
	{
		if(!e) return;
		e.stop();
		var bid = next_tag_up('a', e.target).className;
		var board = this.collection.find_by_id(bid);
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
		var bid = next_tag_up('a', e.target).className;
		var board = this.collection.find_by_id(bid);
		if(!board) return;
		this.release();
		new BoardEditController({
			profile: turtl.profile,
			board: board
		});
	},

	delete_board: function(e)
	{
		if(!e) return;
		e.stop();
		var bid = next_tag_up('a', e.target).className;
		var board = this.collection.find_by_id(bid);
		if(!board) return;
		if(!confirm('Really the board "'+board.get('title')+'", and all of its notes PERMANENTLY?? This cannot be undone!!')) return false;

		turtl.loading(true);
		board.destroy()
			.then(function() {
				var next = this.collection.first() || false;
				turtl.profile.set_current_board(next);
			})
			.catch(function(e) {
				log.error('error: boards: manage: delete_board: ', e);
			})
			.finally(function() {
				turtl.loading(false);
			});
	},

	leave_board: function(e)
	{
		if(!e) return;
		e.stop();
		var bid = next_tag_up('a', e.target).className;
		var board = this.collection.select_one({id: bid, shared: true});
		if(!board) return false;
		var persona = board.get_shared_persona();
		if(!persona) return;
		if(!confirm('Really leave this board? You won\'t be able to access it again until the owner invites you again!')) return false;

		turtl.loading(true);
		board.leave_board(persona).bind(this)
			.then(function() {
				barfr.barf('You have successfully UNshared yourself from the board.');
			})
			.catch(function(err) {
				log.error('error: leave board: ', err);
				barfr.barf('There was a problem leaving the board: '+ err);
			})
			.finally(function() {
				turtl.loading(false);
			});
	}
});
