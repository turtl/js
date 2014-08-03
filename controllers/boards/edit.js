var BoardEditController = Composer.Controller.extend({
	elements: {
		'input[type="text"]': 'inp_title'
	},

	events: {
		'submit form': 'edit_board',
		'keyup input[type=text]': 'test_key',
		'click a[href=#submit]': 'edit_board',
		'click a[href=#cancel]': 'cancel',
		'click .settings a[href=#delete]': 'delete_board'
	},

	board: null,
	profile: null,

	// if true, brings up an inline-editing interface
	bare: false,
	edit_in_modal: true,
	show_settings: false,

	title: false,

	init: function()
	{
		if(!this.board) this.board = new Board();
		this.render();
		if(this.bare)
		{
			this.el.addClass('board-bare');
		}
		else if(this.edit_in_modal)
		{
			modal.open(this.el);
			var close_fn = function() {
				this.release();
				modal.removeEvent('close', close_fn);
			}.bind(this);
			modal.addEvent('close', close_fn);
		}
		this.inp_title.focus();
		turtl.keyboard.detach(); // disable keyboard shortcuts while editing
	},

	release: function()
	{
		if(modal.is_open && this.edit_in_modal) modal.close();
		turtl.keyboard.attach(); // re-enable shortcuts
		this.parent.apply(this, arguments);
	},

	render: function()
	{
		var content = Template.render('boards/edit', {
			board: this.board.toJSON(),
			bare: this.bare,
			title: this.title,
			show_settings: this.show_settings
		});
		this.html(content);
		(function() { this.inp_title.focus(); }).delay(10, this);
	},

	edit_board: function(e)
	{
		if(e) e.stop();
		var title = this.inp_title.get('value');
		if(title.clean() == '') return false;

		var success = null;
		if(this.board.is_new())
		{
			this.board = new Board({title: title});
			success = function() {
				var boards = this.profile.get('boards');
				if(boards) boards.add(this.board);
				this.trigger('new-board', this.board);
			}.bind(this);
		}
		else
		{
			this.board.set({title: title});
		}
		turtl.loading(true);
		this.board.save({
			success: function() {
				turtl.loading(false);
				if(success) success();
				this.release();
			}.bind(this),
			error: function(err) {
				turtl.loading(false);
				barfr.barf('There was a problem saving your board: '+ err);
			}
		});
	},

	delete_board: function(e)
	{
		if(!e) return;
		e.stop();
		if(!this.board) return;
		if(!confirm('Really delete this board, and all of its notes PERMANENTLY?? This cannot be undone!!')) return false;

		turtl.loading(true);
		this.board.destroy({
			success: function() {
				turtl.loading(false);
				this.release();
			}.bind(this),
			error: function() {
				turtl.loading(false);
			}
		});
	},

	cancel: function(e)
	{
		if(e) e.stop();
		this.release();
	},

	test_key: function(e)
	{
		if(this.bare && e.key == 'esc') this.release();
	}
});

