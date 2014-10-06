var BoardEditController = FormController.extend({
	elements: {
		'input[type="text"]': 'inp_title'
	},

	events: {
		'submit form': 'edit_board',
		'click .settings a[href=#delete]': 'delete_board'
	},

	board: null,
	profile: null,

	// if true, brings up an inline-editing interface
	show_settings: false,

	title: false,
	formclass: 'board-edit',

	init: function()
	{
		if(!this.board) this.board = new Board();
		var action = this.board.is_new() ? 'Add' : 'Edit';
		this.title = this.title ? this.title : action + ' board';
		this.parent();
	},

	render: function()
	{
		var content = view.render('boards/edit', {
			board: toJSON(this.board),
			action: this.board.is_new() ? 'Add' : 'Edit',
			title: this.title,
			show_settings: this.show_settings
		});
		this.parent(content);
		(function() { this.inp_title.focus(); }).delay(100, this);
	},

	submit: function(e)
	{
		if(e) e.stop();
		var title = this.inp_title.get('value');
		if(title.clean() == '') return false;

		var success = null;
		if(this.board.is_new())
		{
			this.board = new Board({title: title});
			this.board.generate_key();
			this.board.generate_subkeys();
			// save the board key to the keychain *before* we save the board
			turtl.profile.get('keychain').add_key(this.board.id(), 'board', this.board.key);

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
	}
});

